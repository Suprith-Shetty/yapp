import React, { useState, useEffect, useRef } from "react";
import * as api from "../services/api.js";
import Avatar from "./Avatar.jsx";
import "./Sidebar.css";
import "./UserPicker.css";

const SEARCH_DEBOUNCE_MS = 300;

// The "Search / Users / Chats" column from the build spec: a prominent
// search box up top; below it, live incremental user-search results
// while a query is typed, or the existing conversation list otherwise.
// These are two visually and functionally distinct areas, never merged
// the way a WhatsApp-style single filtered list would do it.
export default function Sidebar({
  conversations,
  loading,
  activeId,
  onSelectConversation,
  onSelectUser,
  user,
  onOpenProfile,
}) {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchState, setSearchState] = useState("idle"); // idle | loading | done | error
  const debounceRef = useRef(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    const trimmed = query.trim();

    if (!trimmed) {
      setSearchState("idle");
      setSearchResults([]);
      return;
    }

    setSearchState("loading");
    debounceRef.current = setTimeout(async () => {
      const requestId = ++requestIdRef.current;
      try {
        const results = await api.searchUsers(trimmed);
        if (requestId !== requestIdRef.current) return; // a newer keystroke superseded this call
        setSearchResults(results.filter((r) => r.id !== user.id));
        setSearchState("done");
      } catch {
        if (requestId !== requestIdRef.current) return;
        setSearchState("error");
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(debounceRef.current);
  }, [query, user.id]);

  const isSearching = query.trim().length > 0;

  return (
    <div className="sidebar">
      <div className="sidebar-search">
        <SearchIcon />
        <input
          type="text"
          placeholder="Search users…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search users"
        />
        {query && (
          <button className="sidebar-search-clear" onClick={() => setQuery("")} aria-label="Clear search">
            ✕
          </button>
        )}
      </div>

      {isSearching ? (
        <div className="sidebar-list">
          <p className="sidebar-section-label-plain">Users</p>
          {searchState === "loading" && <SearchSkeleton />}
          {searchState === "error" && <p className="picker-error">Unable to search users. Please try again.</p>}
          {searchState === "done" && searchResults.length === 0 && (
            <p className="sidebar-empty">No one matches &ldquo;{query.trim()}&rdquo;.</p>
          )}
          {searchState === "done" && searchResults.length > 0 && (
            <div className="picker-list">
              {searchResults.map((u) => (
                <button className="picker-row" key={u.id} onClick={() => onSelectUser(u)}>
                  {/* UserSearchResponseDTO doesn't return a picture URL, so
                      search results always show the initial-letter fallback
                      until that DTO is extended with profilePictureUrl. */}
                  <Avatar src={u.profilePictureUrl} name={u.displayName || u.username} size={36} />
                  <span className="picker-text">
                    <span className="picker-name">{u.displayName || u.username}</span>
                    <span className="picker-username">@{u.username}</span>
                  </span>
                  <span className="picker-chat-action">
                    <ChatBubbleIcon /> Chat
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <p className="sidebar-section-label-plain">Chats</p>
          <div className="sidebar-list">
            {loading ? (
              <SidebarSkeleton />
            ) : conversations.length === 0 ? (
              <p className="sidebar-empty">No conversations yet. Search for someone to start chatting.</p>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.conversationId}
                  className={`convo-item ${activeId === c.conversationId ? "active" : ""}`}
                  onClick={() => onSelectConversation(c)}
                >
                  <Avatar src={c.profilePictureUrl} name={c.displayName || c.username} size={46} online={c.online} />
                  <span className="convo-main">
                    <span className="convo-top-line">
                      <span className="convo-name">{c.displayName || c.username}</span>
                      <span className="convo-time">{formatTime(c.lastMessageAt)}</span>
                    </span>
                 <span className="convo-bottom-line">
                      {c.unreadCount > 0 ? (
                          <span className="conversation-unread">
                          {c.unreadCount > 4
                              ? "4+ unread messages"
                              : `${c.unreadCount} unread message${c.unreadCount === 1 ? "" : "s"}`}
                        </span>
                      ) : (
                          <span className="convo-preview">
                          {c.lastMessage || "Say hi 👋"}
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </>
      )}

      <div className="sidebar-userbar">
        <button className="userbar-identity" onClick={onOpenProfile}>
          <Avatar src={user.profilePictureUrl} name={user.displayName || user.username} size={32} online />
          <span className="userbar-text">
            <span className="userbar-name">{user.displayName || user.username}</span>
            <span className="userbar-status">Online</span>
          </span>
        </button>
        <div className="userbar-actions">
          <button className="userbar-icon-btn" aria-label="Profile" onClick={onOpenProfile}>
            <GearIcon />
          </button>
        </div>
      </div>
    </div>
  );
}

function SidebarSkeleton() {
  return (
    <div className="sidebar-skeleton" aria-label="Loading conversations">
      {[0, 1, 2, 3, 4].map((i) => (
        <div className="skeleton-row" key={i}>
          <span className="skeleton-avatar" />
          <span className="skeleton-lines">
            <span className="skeleton-line w60" />
            <span className="skeleton-line w80" />
          </span>
        </div>
      ))}
    </div>
  );
}

function SearchSkeleton() {
  return (
    <div className="sidebar-skeleton" aria-label="Searching">
      {[0, 1, 2].map((i) => (
        <div className="skeleton-row" key={i}>
          <span className="skeleton-avatar" style={{ width: 36, height: 36 }} />
          <span className="skeleton-lines">
            <span className="skeleton-line w60" />
            <span className="skeleton-line w80" />
          </span>
        </div>
      ))}
    </div>
  );
}

function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
    </svg>
  );
}
function ChatBubbleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 5h16a1 1 0 011 1v10a1 1 0 01-1 1H9l-5 4V6a1 1 0 011-1z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function GearIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.9 2.9l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.6V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1-1.6 1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 11-2.9-2.9l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.6-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.6-1 1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.9-2.9l.1.1a1.7 1.7 0 001.9.3H9a1.7 1.7 0 001-1.6V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.6 1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.9 2.9l-.1.1a1.7 1.7 0 00-.3 1.9V9a1.7 1.7 0 001.6 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.6 1z" />
    </svg>
  );
}
