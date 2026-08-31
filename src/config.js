// ============================================================
// Yapp — environment configuration
//
// Points the frontend at the real Spring Boot backend. Nothing else in
// the app should hard-code a URL or a STOMP destination — everything
// routes through here.
// ============================================================
export const CONFIG = {
  API_BASE_URL: import.meta.env?.VITE_API_BASE_URL || "http://localhost:8080/api",

  // SockJS endpoint registered by the backend's STOMP config.
  WS_URL: import.meta.env?.VITE_WS_URL || "http://localhost:8080/ws",
  WS_TRANSPORT: import.meta.env?.VITE_WS_TRANSPORT || "sockjs", // "sockjs" | "raw"

  // Milliseconds between reconnect attempts if the STOMP connection
  // drops unexpectedly. @stomp/stompjs handles the retry loop itself;
  // this just configures its delay.
  WS_RECONNECT_DELAY: 3000,

  // Client-side pre-upload guardrails only — the backend (FileService)
  // is still the source of truth: images/other files are capped at
  // 10MB and videos at 100MB there, so these mirror that to avoid
  // pointless uploads that would be rejected anyway.
  MAX_IMAGE_MB: 10,
  MAX_VIDEO_MB: 100,
  MAX_FILE_MB: 10,
  ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  ALLOWED_VIDEO_TYPES: ["video/mp4", "video/webm", "video/quicktime"],

  // Synthetic email suffix — see services/api.js `register()` for why
  // this exists (backend User.email is NOT NULL/UNIQUE; the spec asks
  // for an email-free registration UI).
  SYNTHETIC_EMAIL_DOMAIN: "yapp.local",
};

// ------------------------------------------------------------
// STOMP destinations — must match ChatController exactly:
//   @MessageMapping("/chat")   -> /app/chat
//   @MessageMapping("/typing") -> /app/typing
//   @MessageMapping("/read")   -> /app/read
// and the per-user queues ChatController/PresenceEventListener push to:
//   /user/queue/messages
//   /user/queue/message-status
//   /user/queue/typing
// ------------------------------------------------------------
export const STOMP_DESTINATIONS = {
  SEND_MESSAGE: "/app/chat",
  SEND_TYPING: "/app/typing",
  SEND_READ: "/app/read",

  QUEUE_MESSAGES: "/user/queue/messages",
  QUEUE_MESSAGE_STATUS: "/user/queue/message-status",
  QUEUE_TYPING: "/user/queue/typing",

  QUEUE_NOTIFICATIONS: "/user/queue/notifications",

  PRESENCE_TOPIC: "/topic/presence",

  conversationTopic: (conversationId) =>
      `/topic/conversations.${conversationId}`,
};
