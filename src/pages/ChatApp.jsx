import React, { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import * as api from "../services/api.js";
import { on } from "../services/socket.js";
import * as browserNotify from "../services/browserNotifications.js";
import Logo from "../components/Logo.jsx";
import Sidebar from "../components/Sidebar.jsx";
import ConversationView from "../components/ConversationView.jsx";
import ProfilePanel from "../components/ProfilePanel.jsx";
import ConnectionBanner from "../components/ConnectionBanner.jsx";
import EmptyConversation from "../components/EmptyConversation.jsx";
import "./ChatApp.css";

// Normalizes a ConversationListDTO entry into the shape the rest of the
// UI expects. Field names are defensive (several fallbacks per value)
// because ConversationController doesn't currently expose the list
// endpoint this reads from — see the build summary. ConversationService
// .getConversationList() also doesn't include a picture URL, so avatars
// here are enriched separately via GET /users/{id}/profile below.
function normalizeConversation(raw) {
  return {
    conversationId: raw.conversationId ?? raw.id,
    otherUserId: raw.otherUserId ?? raw.userId ?? raw.peerId,
    username: raw.otherUsername ?? raw.otherUserName ?? raw.username,
    displayName: raw.otherDisplayName ?? raw.displayName,
    profilePictureUrl: raw.otherProfilePictureUrl ?? raw.profilePictureUrl ?? null,
    online: raw.online ?? false,
    lastSeen: raw.lastSeen ?? null,
    lastMessage: raw.lastMessage ?? "",
    lastMessageAt: raw.lastMessageAt ?? null,
    unreadCount: raw.unreadCount ?? 0,
  };
}

export default function ChatApp() {
  const { user, logout } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [profileTarget, setProfileTarget] = useState(null);
  const [mobileView, setMobileView] = useState("list"); // list | conversation

  const activeConversationIdRef = useRef(null);
  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);


  useEffect(() => {
    const unlock = () => {
      browserNotify.unlockSound();
      window.removeEventListener("click", unlock);
    };

    window.addEventListener("click", unlock);

    return () => {
      window.removeEventListener("click", unlock);
    };
  }, []);

  // ---- initial conversation list, enriched with each peer's profile
  // (avatar/online/lastSeen) since the list endpoint alone doesn't
  // carry a picture URL ----
  useEffect(() => {
    let cancelled = false;
    setConversationsLoading(true);

    api
      .getConversationList()
      .then(async (raw) => {
        const base = raw.map(normalizeConversation);
        const enriched = await Promise.all(
          base.map(async (c) => {
            if (!c.otherUserId) return c;
            try {
              const profile = await api.getProfile(c.otherUserId);
              return { ...c, profilePictureUrl: profile.profilePictureUrl, online: profile.online, lastSeen: profile.lastSeen };
            } catch {
              return c; // enrichment is best-effort — the fallback initial avatar still works
            }
          })
        );
        if (cancelled) return;
        enriched.sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0));
        setConversations(enriched);
      })
      .catch(() => {
        if (!cancelled) setConversations([]);
      })
      .finally(() => {
        if (!cancelled) setConversationsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  },  [user?.id]);

  // ---- global real-time events (active regardless of which
  // conversation, if any, is currently open) — keeps the sidebar's
  // last-message preview and unread badges current ----
  useEffect(() => {
    const offMessage = on("MESSAGE", (payload) => {
      const isOpen = activeConversationIdRef.current === payload.conversationId;
      const isOwn = payload.senderUserName === user.username;

      setConversations((prev) => {
        const exists = prev.some(
            (c) => c.conversationId === payload.conversationId
        );

        if (exists) {
          const next = prev.map((c) =>
              c.conversationId === payload.conversationId
                  ? {
                    ...c,
                    lastMessage:
                        payload.content || attachmentPreview(payload),
                    lastMessageAt:
                        payload.createdAt || new Date().toISOString(),
                    unreadCount:
                        isOpen || isOwn
                            ? 0
                            : (c.unreadCount || 0) + 1,
                  }
                  : c
          );

          return next.sort(
              (a, b) =>
                  new Date(b.lastMessageAt || 0) -
                  new Date(a.lastMessageAt || 0)
          );
        }

        // NEW conversation — recipient has never chatted with this user
        const newConversation = {
          conversationId: payload.conversationId,
          otherUserId: payload.senderUserId,
          username: payload.senderUserName,
          displayName: payload.senderUserName,
          profilePictureUrl: null,
          online: false,
          lastSeen: null,
          lastMessage:
              payload.content || attachmentPreview(payload),
          lastMessageAt:
              payload.createdAt || new Date().toISOString(),
          unreadCount: isOwn || isOpen ? 0 : 1,
        };

        return [newConversation, ...prev];
      });

      if (!isOwn && (!isOpen || document.hidden)) {
        const convo = conversations.find((c) => c.conversationId === payload.conversationId);
        browserNotify.notify({
          title: convo?.displayName || convo?.username || payload.senderUserName || "New message",
          body: payload.content || "Sent an attachment",
          icon: convo?.profilePictureUrl,
          onClick: () => openConversationById(payload.conversationId),
        });
      }
    });

    return () => offMessage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.username]);

  // ---- realtime presence updates ----
  useEffect(() => {
    const offOnline = on("USER_ONLINE", (payload) => {
      if (!payload?.userId) return;

      setConversations((prev) =>
          prev.map((conversation) =>
              String(conversation.otherUserId) === String(payload.userId)
                  ? {
                    ...conversation,
                    online: true,
                  }
                  : conversation
          )
      );
    });

    const offOffline = on("USER_OFFLINE", (payload) => {
      if (!payload?.userId) return;

      setConversations((prev) =>
          prev.map((conversation) =>
              String(conversation.otherUserId) === String(payload.userId)
                  ? {
                    ...conversation,
                    online: false,
                    lastSeen:
                        payload.lastSeen || new Date().toISOString(),
                  }
                  : conversation
          )
      );
    });

    return () => {
      offOnline();
      offOffline();
    };
  }, []);



  const openConversationById = useCallback((conversationId) => {
    setActiveConversationId(conversationId);
    setMobileView("conversation");
    setConversations((prev) => prev.map((c) => (c.conversationId === conversationId ? { ...c, unreadCount: 0 } : c)));
  }, []);

  const openConversation = useCallback((conversation) => {
    openConversationById(conversation.conversationId);
  }, [openConversationById]);

  // Started from a search result — POST /conversations/direct/{userId}
  // returns only the bare Conversation entity (id, type, createdAt), so
  // the peer's display info is filled in from the search result plus a
  // profile fetch for the avatar/presence.
  const startConversationWithUser = useCallback(
    async (searchUser) => {
      const existing = conversations.find((c) => c.otherUserId === searchUser.id);
      if (existing) {
        openConversation(existing);
        return;
      }
      try {
        const [conversation, profile] = await Promise.all([
          api.createOrGetDirectConversation(searchUser.id),
          api.getProfile(searchUser.id).catch(() => null),
        ]);
        const normalized = {
          conversationId: conversation.id,
          otherUserId: searchUser.id,
          username: searchUser.username,
          displayName: profile?.displayName || searchUser.displayName,
          profilePictureUrl: profile?.profilePictureUrl || null,
          online: profile?.online || false,
          lastSeen: profile?.lastSeen || null,
          lastMessage: "",
          lastMessageAt: new Date().toISOString(),
          unreadCount: 0,
        };
        setConversations((prev) => [normalized, ...prev.filter((c) => c.conversationId !== normalized.conversationId)]);
        openConversationById(normalized.conversationId);
      } catch {
        // Unable to open this conversation — the search panel stays put
        // so the person can try again; nothing silently breaks.
      }
    },
    [conversations, openConversation, openConversationById]
  );

  const backToList = () => {
    setActiveConversationId(null);
    setMobileView("list");
  };


  const activeConversation = conversations.find((c) => c.conversationId === activeConversationId) || null;

  return (
    <div className="chat-app">
      <ConnectionBanner />

      <div className={`app-body ${mobileView === "conversation" ? "mobile-conversation" : "mobile-list"}`}>
        <div className="sidebar-col">
          <div className="sidebar-brand">
            <Logo size={26} />
            <span className="sidebar-brand-name gradient-text">Yapp</span>
          </div>
          <Sidebar
            conversations={conversations}
            loading={conversationsLoading}
            activeId={activeConversationId}
            onSelectConversation={openConversation}
            onSelectUser={startConversationWithUser}
            user={user}
            onOpenProfile={() => setProfileTarget(user)}
          />
        </div>

        <div className="main-col">
          {activeConversation ? (
            <ConversationView
              conversation={activeConversation}
              currentUser={user}
              onBack={backToList}
              onOpenPeerProfile={(peer) => setProfileTarget(peer)}
            />
          ) : (
            <EmptyConversation />
          )}
        </div>
      </div>

      {profileTarget && (
        <ProfilePanel
          user={profileTarget}
          isSelf={profileTarget.id ? profileTarget.id === user.id : profileTarget.username === user.username}
          onClose={() => setProfileTarget(null)}
          onLogout={logout}
        />
      )}
    </div>
  );
}

function attachmentPreview(payload) {
  if (payload.messageType !== "FILE") return "";
  const type = payload.fileType || "";
  if (type.startsWith("image/")) return "📷 Photo";
  if (type.startsWith("video/")) return "🎬 Video";
  return `📎 ${payload.fileName || "File"}`;
}
