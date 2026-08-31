import React, { useEffect, useRef, useState, useCallback } from "react";
import * as api from "../services/api.js";
import {
  emitTyping,
  emitMessageRead,
  sendChatMessage,
  subscribeToConversation,
  unsubscribeFromConversation,
  on,
} from "../services/socket.js";
import Avatar from "./Avatar.jsx";
import MessageGroup from "./MessageGroup.jsx";
import TypingDots from "./TypingDots.jsx";
import Composer from "./Composer.jsx";
import "./ConversationView.css";

const TYPING_TIMEOUT_MS = 4000;

export default function ConversationView({
                                           conversation,
                                           currentUser,
                                           onBack,
                                           onOpenPeerProfile,
                                         }) {
  const conversationId = conversation?.conversationId;
  const peer = conversation;

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [typingPeer, setTypingPeer] = useState(false);
  const [replyTo, setReplyTo] = useState(null);

  const scrollRef = useRef(null);
  const isNearBottomRef = useRef(true);
  const typingTimeoutRef = useRef(null);



  // ============================================================
// CONVERSATION WEBSOCKET SUBSCRIPTION
// ============================================================

  useEffect(() => {
    if (!conversationId) return;

    subscribeToConversation(conversationId);

    return () => {
      unsubscribeFromConversation(conversationId);
    };
  }, [conversationId]);
  // ============================================================
  // LOAD MESSAGE HISTORY + REACTIONS
  // ============================================================

  useEffect(() => {
    if (!conversationId) return;

    setLoading(true);
    setLoadError(false);
    setMessages([]);
    setReplyTo(null);
    setTypingPeer(false);

    Promise.all([
      api.getMessages(conversationId),
      api.getConversationReactions(conversationId),
    ])
        .then(([msgs, reactions]) => {
          const reactionsByMessage = new Map();

          reactions.forEach((reaction) => {
            if (!reactionsByMessage.has(reaction.messageId)) {
              reactionsByMessage.set(reaction.messageId, []);
            }

            reactionsByMessage
                .get(reaction.messageId)
                .push(reaction);
          });

          const messagesWithReactions = msgs.map((message) => ({
            ...message,
            reactions:
                reactionsByMessage.get(message.messageId) || [],
          }));

          setMessages(messagesWithReactions);

          // Mark incoming messages as read
          msgs.forEach((message) => {
            const isIncoming =
                message.senderUserName !== currentUser.username;

            const isUnread =
                message.status !== "READ";

            if (isIncoming && isUnread) {
              emitMessageRead(
                  conversationId,
                  message.messageId
              );
            }
          });
        })
        .catch((error) => {
          console.error(
              "[Yapp] Failed to load conversation:",
              error
          );

          setLoadError(true);
        })
        .finally(() => {
          setLoading(false);
        });

    api
        .markConversationRead(conversationId)
        .catch(() => {});
  }, [conversationId, currentUser.username]);

  // ============================================================
  // REALTIME EVENTS
  // ============================================================

  useEffect(() => {
    if (!conversationId) return;

    // ----------------------------------------------------------
    // NEW MESSAGE
    // ----------------------------------------------------------

    const offMessage = on("MESSAGE", (payload) => {
      if (payload.conversationId !== conversationId) {
        return;
      }

      setMessages((prev) => {
        if (
            prev.some(
                (message) =>
                    message.messageId === payload.messageId
            )
        ) {
          return prev;
        }

        return [...prev, payload];
      });

      // Automatically read incoming message
      if (
          payload.senderUserName !==
          currentUser.username
      ) {
        emitMessageRead(
            conversationId,
            payload.messageId
        );
      }
    });

    // ----------------------------------------------------------
    // MESSAGE STATUS
    // ----------------------------------------------------------

    const offStatus = on(
        "MESSAGE_STATUS",
        (payload) => {
          if (
              payload.conversationId !==
              conversationId
          ) {
            return;
          }

          const statusMessageId =
              payload.messageId ?? payload.id;

          setMessages((prev) =>
              prev.map((message) => {
                const messageId =
                    message.messageId ?? message.id;

                if (
                    String(messageId) ===
                    String(statusMessageId)
                ) {
                  return {
                    ...message,
                    status: payload.status,
                  };
                }

                return message;
              })
          );
        }
    );

    // ----------------------------------------------------------
    // TYPING
    // ----------------------------------------------------------

    const offTyping = on(
        "TYPING",
        (payload) => {
          if (
              payload.conversationId !==
              conversationId
          ) {
            return;
          }

          const typingUserName =
              payload.userName ??
              payload.username ??
              payload.senderUserName;

          if (
              typingUserName ===
              currentUser.username
          ) {
            return;
          }

          const isTyping =
              payload.typing ??
              payload.isTyping ??
              false;

          clearTimeout(
              typingTimeoutRef.current
          );

          setTypingPeer(isTyping);

          if (isTyping) {
            typingTimeoutRef.current =
                setTimeout(
                    () => setTypingPeer(false),
                    TYPING_TIMEOUT_MS
                );
          }
        }
    );

    // ----------------------------------------------------------
    // REALTIME REACTIONS
    // ----------------------------------------------------------

    const offReaction = on(
        "REACTION",
        (event) => {
          if (
              event.conversationId !==
              conversationId
          ) {
            return;
          }

          setMessages((prevMessages) =>
              prevMessages.map((message) => {
                if (
                    message.messageId !==
                    event.messageId
                ) {
                  return message;
                }

                const currentReactions =
                    message.reactions || [];

                // ------------------------------
                // ADD / CHANGE
                // ------------------------------

                if (event.action === "ADD") {
                  return {
                    ...message,

                    reactions: [
                      ...currentReactions.filter(
                          (reaction) =>
                              reaction.userId !==
                              event.userId
                      ),

                      {
                        reactionId:
                        event.reactionId,

                        messageId:
                        event.messageId,

                        userId:
                        event.userId,

                        username:
                        event.username,

                        emoji:
                        event.emoji,
                      },
                    ],
                  };
                }

                // ------------------------------
                // REMOVE
                // ------------------------------

                if (event.action === "REMOVE") {
                  return {
                    ...message,

                    reactions:
                        currentReactions.filter(
                            (reaction) =>
                                reaction.userId !==
                                event.userId
                        ),
                  };
                }

                return message;
              })
          );
        }
    );

    // ----------------------------------------------------------
    // CLEANUP
    // ----------------------------------------------------------

    return () => {
      offMessage();
      offStatus();
      offTyping();
      offReaction();

      clearTimeout(
          typingTimeoutRef.current
      );
    };
  }, [
    conversationId,
    currentUser.username,
  ]);

  // ============================================================
  // AUTOSCROLL
  // ============================================================

  const handleScroll = () => {
    const el = scrollRef.current;

    if (!el) return;

    isNearBottomRef.current =
        el.scrollHeight -
        el.scrollTop -
        el.clientHeight <
        120;
  };

  useEffect(() => {
    if (isNearBottomRef.current) {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, typingPeer]);

  // ============================================================
  // SEND TEXT
  // ============================================================

  const handleSendText = useCallback(
      (text, replyToMessageId) => {
        sendChatMessage({
          conversationId,
          content: text,
          messageType: "TEXT",
          replyToMessageId:
              replyToMessageId || null,
        });

        setReplyTo(null);
      },
      [conversationId]
  );

  // ============================================================
  // FILE SENT
  // ============================================================

  const handleFileSent = useCallback(
      (result) => {
        setMessages((prev) =>
            prev.some(
                (message) =>
                    message.messageId ===
                    result.message.messageId
            )
                ? prev
                : [
                  ...prev,
                  {
                    ...result.message,
                    status: "SENT",
                  },
                ]
        );

        setReplyTo(null);
      },
      []
  );

  // ============================================================
  // TYPING
  // ============================================================

  const handleTyping = useCallback(
      () =>
          emitTyping(
              conversationId,
              true
          ),
      [conversationId]
  );

  const handleStopTyping =
      useCallback(
          () =>
              emitTyping(
                  conversationId,
                  false
              ),
          [conversationId]
      );

  // ============================================================
  // UI
  // ============================================================

  return (
      <div className="conversation-view">

        {/* HEADER */}

        <div className="conv-header">

          <button
              className="back-btn"
              onClick={onBack}
              aria-label="Back to conversations"
          >
            <ChevronLeft />
          </button>

          <button
              className="header-identity-btn"
              onClick={() =>
                  onOpenPeerProfile?.(peer)
              }
          >
            <Avatar
                src={peer?.profilePictureUrl}
                name={
                    peer?.displayName ||
                    peer?.username
                }
                size={40}
                ringed
            />

            <div className="header-meta">

            <span className="header-name">
              {peer?.displayName ||
                  peer?.username}
            </span>

              <span className="header-status">

              {peer?.online ? (
                  <>
                    <span className="status-dot online" />
                    Online
                  </>
              ) : (
                  <>
                    <span className="status-dot offline" />
                    {formatLastSeen(
                        peer?.lastSeen
                    )}
                  </>
              )}

            </span>

            </div>
          </button>

        </div>

        {/* MESSAGES */}

        <div
            className="conv-scroll"
            ref={scrollRef}
            onScroll={handleScroll}
        >

          {loading && (
              <p className="conv-loading">
                Loading conversation…
              </p>
          )}

          {loadError && (
              <div className="conv-error-state">
                <p>
                  Unable to load this conversation.
                  Please try again.
                </p>
              </div>
          )}

          {!loading &&
              !loadError &&
              messages.length === 0 && (
                  <div className="room-welcome">
                    <p className="room-welcome-title">
                      No messages yet
                    </p>

                    <p className="room-welcome-sub">
                      Say hi to{" "}
                      {peer?.displayName ||
                          peer?.username}{" "}
                      👋
                    </p>
                  </div>
              )}

          {groupMessages(messages).map(
              (group) => {
                const isOwn =
                    group.senderUserName ===
                    currentUser.username;

                const sender =
                    isOwn
                        ? currentUser
                        : peer;

                return (
                    <MessageGroup
                        key={
                          group.messages[0]
                              .messageId
                        }
                        sender={sender}
                        isOwn={isOwn}
                        messages={
                          group.messages
                        }
                        onReply={setReplyTo}
                    />
                );
              }
          )}

          {typingPeer && (
              <div className="typing-row">
            <span className="typing-text">
              {peer?.displayName ||
                  peer?.username}{" "}
              is typing
            </span>

                <TypingDots />
              </div>
          )}

        </div>

        {/* COMPOSER */}

        <Composer
            conversationId={conversationId}
            peerName={
                peer?.displayName ||
                peer?.username
            }
            replyTo={replyTo}
            onCancelReply={() =>
                setReplyTo(null)
            }
            onSendText={handleSendText}
            onFileSent={handleFileSent}
            onTyping={handleTyping}
            onStopTyping={
              handleStopTyping
            }
        />

      </div>
  );
}

// ============================================================
// GROUP MESSAGES
// ============================================================

function groupMessages(messages) {
  const groups = [];

  for (const message of messages) {
    const last =
        groups[groups.length - 1];

    if (
        last &&
        last.senderUserName ===
        message.senderUserName &&
        !message.replyToMessageId
    ) {
      last.messages.push(message);
    } else {
      groups.push({
        senderUserName:
        message.senderUserName,
        messages: [message],
      });
    }
  }

  return groups;
}

// ============================================================
// LAST SEEN
// ============================================================

function formatLastSeen(lastSeen) {
  if (!lastSeen) {
    return "offline";
  }

  const date = new Date(lastSeen);

  if (Number.isNaN(date.getTime())) {
    return "offline";
  }

  const now = new Date();

  const diffMs = now - date;

  const diffHours =
      diffMs / (1000 * 60 * 60);

  if (diffHours < 24) {
    return `last seen ${date.toLocaleTimeString(
        undefined,
        {
          hour: "numeric",
          minute: "2-digit",
        }
    )}`;
  }

  return `last seen ${date.toLocaleDateString(
      undefined,
      {
        month: "short",
        day: "numeric",
        year:
            date.getFullYear() !==
            now.getFullYear()
                ? "numeric"
                : undefined,
      }
  )}`;
}

// ============================================================
// BACK ARROW
// ============================================================

function ChevronLeft() {
  return (
      <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
      >
        <path
            d="M15 18l-6-6 6-6"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
      </svg>
  );
}