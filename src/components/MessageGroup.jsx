import React, { useState, useRef,useEffect } from "react";
import * as api from "../services/api.js";
import Avatar from "./Avatar.jsx";
import MessageAttachment from "./MessageAttachment.jsx";
import "./MessageGroup.css";
import { useAuth } from "../context/AuthContext.jsx";

export default function MessageGroup({ sender, isOwn, messages, onReply }) {
  const { user } = useAuth();

  return (
      <div className={`msg-group ${isOwn ? "own" : "received"}`}>
        <Avatar
            src={sender?.profilePictureUrl}
            name={sender?.displayName || sender?.username}
            size={38}
        />

        <div className="msg-group-body">
          <div className="msg-group-header">
          <span className={`msg-sender ${isOwn ? "own" : ""}`}>
            {sender?.displayName || sender?.username}
          </span>
          </div>

          {messages.map((m) => (
              <MessageLine
                  key={m.messageId}
                  message={m}
                  isOwn={isOwn}
                  currentUser={user}
                  onReply={() => onReply(m)}
              />
          ))}
        </div>
      </div>
  );
}

function MessageLine({ message, isOwn, currentUser, onReply }) {
  const [showTime, setShowTime] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [showReactions, setShowReactions] = useState(false);
  const [reactions, setReactions] = useState(message.reactions || []);
  useEffect(() => {
    setReactions(message.reactions || []);
  }, [message.reactions]);

  const touchRef = useRef(null);

  const hasAttachment = message.messageType === "FILE";
  const SWIPE_TRIGGER = 56;

  const reactionEmojis = ["❤️", "😂", "😮", "😢", "👍", "🙏"];

  // ------------------------------------------------------------
  // SWIPE TO REPLY
  // ------------------------------------------------------------

  const handleTouchStart = (e) => {
    touchRef.current = {
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY,
      dragging: false,
    };
  };

  const handleTouchMove = (e) => {
    if (!touchRef.current) return;

    const dx = e.touches[0].clientX - touchRef.current.startX;
    const dy = e.touches[0].clientY - touchRef.current.startY;

    if (
        !touchRef.current.dragging &&
        Math.abs(dx) > 10 &&
        Math.abs(dx) > Math.abs(dy)
    ) {
      touchRef.current.dragging = true;
    }

    if (touchRef.current.dragging && dx > 0) {
      setDragX(Math.min(dx, 84));
    }
  };

  const handleTouchEnd = () => {
    if (dragX > SWIPE_TRIGGER) {
      onReply();
    }

    setDragX(0);
    touchRef.current = null;
  };

  // ------------------------------------------------------------
  // REACTIONS
  // ------------------------------------------------------------

  const handleReaction = async (emoji) => {
    // Make sure we actually have the logged-in user
    if (!currentUser?.id) {
      console.error("[Yapp] Cannot react: current user not available");
      return;
    }

    // Does the current user already have a reaction?
    const existingReaction = reactions.find(
        (reaction) => reaction.userId === currentUser.id
    );

    try {
      // --------------------------------------------------------
      // SAME EMOJI -> REMOVE REACTION
      // --------------------------------------------------------

      if (existingReaction?.emoji === emoji) {
        await api.removeReaction(
            message.messageId,
            emoji
        );

        setReactions((prev) =>
            prev.filter(
                (reaction) =>
                    reaction.userId !== currentUser.id
            )
        );
      }

          // --------------------------------------------------------
          // NEW EMOJI -> ADD / CHANGE REACTION
      // --------------------------------------------------------

      else {
        const reaction = await api.addReaction(
            message.messageId,
            emoji
        );

        setReactions((prev) => [
          ...prev.filter(
              (item) =>
                  item.userId !== currentUser.id
          ),
          reaction,
        ]);
      }

      // Close reaction picker
      setShowReactions(false);

    } catch (error) {
      console.error(
          "[Yapp] Failed to update reaction:",
          error
      );
    }
  };

  // ------------------------------------------------------------
  // UI
  // ------------------------------------------------------------

  return (
      <div
          className="msg-line"
          onClick={() => setShowTime((s) => !s)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={
            dragX
                ? { transform: `translateX(${dragX}px)` }
                : undefined
          }
      >
        {/* Swipe reply indicator */}
        {dragX > 12 && (
            <span
                className="swipe-reply-hint"
                style={{
                  opacity: Math.min(
                      1,
                      dragX / SWIPE_TRIGGER
                  ),
                }}
            >
          <ReplyIcon />
        </span>
        )}

        {/* Reply preview */}
        {message.replyToMessageId && (
            <div className="reply-preview">
              <ReplyArrow />

              <span className="reply-preview-text">
            <strong>
              {message.replyToSenderUserName}:{" "}
            </strong>

                {replyPreviewText(message)}
          </span>
            </div>
        )}

        {/* Message content */}
        <div className="msg-line-content">
          {message.content && (
              <p className="msg-text">
                {message.content}

                <span
                    className={`msg-time-tooltip ${
                        showTime ? "visible" : ""
                    }`}
                >
              {formatExactTime(message.createdAt)}
            </span>
              </p>
          )}

          {isOwn && (
              <Ticks status={message.status} />
          )}
        </div>

        {/* File attachment */}
        {hasAttachment && (
            <MessageAttachment
                messageId={message.messageId}
                fileUrl={message.fileUrl}
                fileName={message.fileName}
                fileType={message.fileType}
                fileSize={message.fileSize}
            />
        )}

        {/* Time for attachment-only messages */}
        {!message.content && !hasAttachment && (
            <span
                className={`msg-time-tooltip standalone ${
                    showTime ? "visible" : ""
                }`}
            >
          {formatExactTime(message.createdAt)}
        </span>
        )}

        {/* Existing reactions */}
        {reactions.length > 0 && (
            <div className="message-reactions">
              {Object.entries(
                  reactions.reduce((groups, reaction) => {
                    groups[reaction.emoji] =
                        (groups[reaction.emoji] || 0) + 1;

                    return groups;
                  }, {})
              ).map(([emoji, count]) => (
                  <span
                      key={emoji}
                      className="message-reaction"
                  >
              {emoji}

                    {count > 1 && (
                        <span className="reaction-count">
                  {count}
                </span>
                    )}
            </span>
              ))}
            </div>
        )}

        {/* Reaction picker */}
        {showReactions && (
            <div
                className="reaction-picker"
                onClick={(e) => e.stopPropagation()}
            >
              {reactionEmojis.map((emoji) => (
                  <button
                      key={emoji}
                      type="button"
                      className="reaction-option"
                      onClick={() => handleReaction(emoji)}
                  >
                    {emoji}
                  </button>
              ))}
            </div>
        )}

        {/* Hover toolbar */}
        <div className="msg-hover-toolbar">
          <button
              className="hover-action"
              aria-label="React"
              onClick={(e) => {
                e.stopPropagation();
                setShowReactions((value) => !value);
              }}
          >
            😊
          </button>

          <button
              className="hover-action"
              aria-label="Reply"
              onClick={(e) => {
                e.stopPropagation();
                onReply();
              }}
          >
            <ReplyIcon />
          </button>
        </div>
      </div>
  );
}

// ============================================================
// REPLY PREVIEW
// ============================================================

function replyPreviewText(message) {
  const type = message.replyToMessageType;

  if (type === "FILE") {
    const name = message.replyToFileName || "";

    if (/\.(png|jpe?g|gif|webp)$/i.test(name)) {
      return "📷 Image";
    }

    if (/\.(mp4|webm|mov)$/i.test(name)) {
      return "🎥 Video";
    }

    return `📎 ${name || "File"}`;
  }

  return message.replyToContent || "";
}

// ============================================================
// MESSAGE STATUS
// ============================================================

function Ticks({ status }) {
  if (!status) return null;

  const label =
      status === "READ"
          ? "Seen"
          : "Sent";

  return (
      <span
          className={`msg-status ${
              status === "READ"
                  ? "read"
                  : "sent"
          }`}
      >
      {label}
    </span>
  );
}

// ============================================================
// TIME
// ============================================================

function formatExactTime(iso) {
  if (!iso) return "";

  const d = new Date(iso);

  if (Number.isNaN(d.getTime())) {
    return "";
  }

  return d.toLocaleString(
      undefined,
      {
        hour: "numeric",
        minute: "2-digit",
        month: "short",
        day: "numeric",
      }
  );
}

// ============================================================
// REPLY ICON
// ============================================================

function ReplyArrow() {
  return (
      <svg
          width="20"
          height="14"
          viewBox="0 0 20 14"
          fill="none"
          aria-hidden="true"
      >
        <path
            d="M2 2v4a3 3 0 003 3h13M13 3l5 6-5 6"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
      </svg>
  );
}

function ReplyIcon() {
  return (
      <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
      >
        <path
            d="M9 10L4 15l5 5"
            strokeLinecap="round"
            strokeLinejoin="round"
        />

        <path
            d="M4 15h11a5 5 0 005-5V8"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
      </svg>
  );
}