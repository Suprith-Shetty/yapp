// ============================================================
// Yapp — REST service layer
//
// Every function here maps to one real Spring Boot endpoint. No mocks,
// no invented routes — see the header comment above each function for
// the exact backend contract it relies on.
//
// Error handling: the backend's GlobalExceptionHandler always returns
// { status, error, message, path } (ErrorResponse.java) on failure.
// `request()` reads that and throws an Error whose `.friendly` field
// is a user-safe message (see FRIENDLY_MESSAGES / friendlyFor below) —
// components should render `.friendly`, never `.message` or raw
// backend text, so a stray stack trace can never leak into the UI.
// ============================================================

import { CONFIG } from "../config.js";

function authHeaders() {
  const token = localStorage.getItem("yapp_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Maps known situations to the exact copy the build spec calls for.
// Falls back to a generic message for anything unrecognized rather
// than ever showing a raw backend string.
function friendlyFor({ status, path = "", backendMessage = "" } = {}, context) {
  const msg = (backendMessage || "").toLowerCase();

  if (context === "register") {
    if (msg.includes("username")) return "Username is already taken.";
    if (msg.includes("email")) return "That username is unavailable. Please try another.";
    return "We couldn't create your account. Please try again.";
  }
  if (context === "login") {
    if (status === 401) return "Invalid username or password.";
    return "We couldn't sign you in. Please try again.";
  }
  if (context === "search") return "Unable to search users. Please try again.";
  if (context === "conversation") return "Unable to open this conversation. Please try again.";
  if (context === "messages") return "Unable to load this conversation. Please try again.";
  if (context === "send") return "Message failed to send. Please try again.";
  if (context === "upload") return "File upload failed. Please try again.";
  if (context === "media") return "Unable to load media.";

  if (status === 401) return "Your session has expired. Please log in again.";
  if (status === 403) return "You don't have permission to perform this action.";
  if (status === 400) return "Please fill in all required fields.";
  if (status >= 500 || !status) return "Something went wrong. Please try again.";
  return "Something went wrong. Please try again.";
}

async function request(path, options = {}, context) {
  let res;
  try {
    res = await fetch(`${CONFIG.API_BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
        ...(options.headers || {}),
      },
    });
  } catch {
    const err = new Error("Network error");
    err.friendly = "Something went wrong. Please try again.";
    throw err;
  }

  if (!res.ok) {
    let body = {};
    try {
      body = await res.json();
    } catch {
      // non-JSON error body (e.g. a raw Spring error page) — never
      // shown to the user, only used for status-code fallback below
    }
    const err = new Error(body.message || `Request failed: ${res.status}`);
    err.status = res.status;
    err.friendly = friendlyFor({ status: res.status, path, backendMessage: body.message }, context);
    throw err;
  }

  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text; // some endpoints (file URL lookup) return a plain string
  }
}

// ---------------- Auth ----------------
// POST /api/auth/register -> { userName, message }
// Backend requires a unique, non-null email (User.email column), but
// the build spec removes email from the UI entirely. We satisfy the
// existing contract with a synthetic, never-shown email derived from
// the username, rather than inventing a new backend endpoint/field.
export async function register({ username, password }) {
  return request(
    "/auth/register",
    {
      method: "POST",
      body: JSON.stringify({
        username,
        email: `${username}@${CONFIG.SYNTHETIC_EMAIL_DOMAIN}`,
        password,
      }),
    },
    "register"
  );
}

// POST /api/auth/login -> { token, expiresIn }
export async function login({ username, password }) {
  return request(
    "/auth/login",
    { method: "POST", body: JSON.stringify({username, password }) },
    "login"
  );
}

// ---------------- Users ----------------
// GET /api/users/{userId}/profile -> UserProfileDTO
export async function getProfile(userId) {
  return request(`/users/${userId}/profile`, {}, "conversation");
}

// GET /api/users/search?username= -> UserSearchResponseDTO[]
export async function searchUsers(username) {
  return request(`/users/search?username=${encodeURIComponent(username)}`, {}, "search");
}

// GET /api/users/{userId}/presence -> { userId, username, online, lastSeen }
export async function getPresence(userId) {
  return request(`/users/${userId}/presence`, {}, "conversation");
}

// POST /api/users/me/profile-picture (multipart, field "file") -> UserProfileDTO
export function uploadProfilePicture(file) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${CONFIG.API_BASE_URL}/users/me/profile-picture`);
    const token = localStorage.getItem("yapp_token");
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(Object.assign(new Error("Bad response"), { friendly: friendlyFor({}, "upload") }));
        }
      } else {
        reject(Object.assign(new Error(`Upload failed: ${xhr.status}`), { status: xhr.status, friendly: friendlyFor({ status: xhr.status }, "upload") }));
      }
    };
    xhr.onerror = () => reject(Object.assign(new Error("Network error"), { friendly: friendlyFor({}, "upload") }));
    const form = new FormData();
    form.append("file", file);
    xhr.send(form);
  });
}

// DELETE /api/users/me/profile-picture -> UserProfileDTO
export async function removeProfilePicture() {
  return request("/users/me/profile-picture", { method: "DELETE" }, "upload");
}

// ---------------- Conversations ----------------
// POST /api/conversations/direct/{userId} -> Conversation
export async function createOrGetDirectConversation(userId) {
  return request(`/conversations/direct/${userId}`, { method: "POST" }, "conversation");
}

// GET /api/conversations
// NOTE: ConversationController does not currently expose this route,
// even though ConversationService.getConversationList(userId) already
// implements exactly what the sidebar chat list needs. The frontend
// assumes it exists at this path, returning ConversationListDTO[]. See
// the build summary for the one-line controller addition this needs.
export async function getConversationList() {
  return request("/conversations", {}, "conversation");
}

// GET /api/conversations/{conversationId}/messages -> ChatMessageHistoryDTO[]
export async function getMessages(conversationId) {
  return request(`/conversations/${conversationId}/messages`, {}, "messages");
}

// GET /api/conversations/{conversationId}/unread -> { conversationId, unreadCount }
export async function getUnreadCount(conversationId) {
  return request(`/conversations/${conversationId}/unread`, {}, "conversation");
}

// PUT /api/conversations/{conversationId}/read
export async function markConversationRead(conversationId) {
  return request(`/conversations/${conversationId}/read`, { method: "PUT" }, "conversation");
}

// ---------------- message reactions ----------------

export async function addReaction(messageId, emoji) {
  const response = await request(
      `/reactions/message/${messageId}`,
      {
        method: "POST",
        body: JSON.stringify({ emoji }),
      }
  );

  return response;
}

export async function removeReaction(messageId, emoji) {
  await request(
      `/reactions/message/${messageId}?emoji=${encodeURIComponent(emoji)}`,
      {
        method: "DELETE",
      }
  );
}

export async function getConversationReactions(conversationId) {
  return request(
      `/reactions/conversation/${conversationId}`
  );
}

// ---------------- File messages ----------------
// POST /api/files/upload (multipart: file, conversationId, caption?)
// -> ChatMessageResult. Unlike a generic "upload only" endpoint, this
// one BOTH uploads to Cloudinary AND creates + delivers the chat
// message server-side in one call — so on success the returned
// message is already sent, there is no separate STOMP publish step.
//
// NOTE: FileController/ChatService.saveFileMessage does not accept a
// replyToMessageId — replying to an image/video/file isn't supported
// by the current backend contract, only text messages are (see
// ChatController /chat + ChatMessageDTO.replyToMessageId). The reply
// action is disabled on non-text messages in the UI as a result.
export function uploadFileMessage(file, conversationId, caption, { onProgress, signal } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${CONFIG.API_BASE_URL}/files/upload`);
    const token = localStorage.getItem("yapp_token");
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(Object.assign(new Error("Bad response"), { friendly: friendlyFor({}, "upload") }));
        }
      } else {
        let backendMessage;
        try {
          backendMessage = JSON.parse(xhr.responseText)?.message;
        } catch {
          /* ignore */
        }
        reject(
          Object.assign(new Error(`Upload failed: ${xhr.status}`), {
            status: xhr.status,
            friendly: friendlyFor({ status: xhr.status, backendMessage }, "upload"),
          })
        );
      }
    };
    xhr.onerror = () => reject(Object.assign(new Error("Network error"), { friendly: friendlyFor({}, "upload") }));
    xhr.onabort = () => reject(Object.assign(new Error("Upload cancelled"), { friendly: "Upload cancelled." }));
    if (signal) signal.addEventListener("abort", () => xhr.abort());

    const form = new FormData();
    form.append("file", file);
    form.append("conversationId", conversationId);
    if (caption) form.append("caption", caption);
    xhr.send(form);
  });
}

// GET /api/files/{messageId} -> the Cloudinary URL as plain text/JSON
// string (NOT raw file bytes). Never turn this into a Blob/object URL —
// just read the returned URL and use it directly as an <img>/<video> src.
export async function getFileUrl(messageId) {
  const result = await request(`/files/${messageId}`, {}, "media");
  // ResponseEntity.ok(fileUrl) serializes a bare string as a JSON string
  return typeof result === "string" ? result.replace(/^"|"$/g, "") : result;
}
