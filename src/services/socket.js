// ============================================================
// Yapp — WebSocket / STOMP connection layer
// ============================================================

import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { CONFIG, STOMP_DESTINATIONS as D } from "../config.js";

let client = null;

let status = "disconnected";
// "connecting" | "connected" | "reconnecting" | "disconnected"

const statusListeners = new Set();
const eventListeners = new Map();

// Active STOMP subscriptions
const liveSubscriptions = new Map();

// Conversations currently being viewed
const desiredConversationSubs = new Set();

// ============================================================
// EVENTS
// ============================================================

function setStatus(next) {
  status = next;

  statusListeners.forEach((callback) => {
    try {
      callback(status);
    } catch (error) {
      console.error(
          "[Yapp WS] status listener error:",
          error
      );
    }
  });
}

export function getStatus() {
  return status;
}

export function onStatusChange(callback) {
  statusListeners.add(callback);

  return () => {
    statusListeners.delete(callback);
  };
}

export function on(eventType, callback) {
  if (!eventListeners.has(eventType)) {
    eventListeners.set(eventType, new Set());
  }

  eventListeners.get(eventType).add(callback);

  return () => {
    eventListeners.get(eventType)?.delete(callback);
  };
}

function emit(eventType, payload) {
  eventListeners
      .get(eventType)
      ?.forEach((callback) => {
        try {
          callback(payload);
        } catch (error) {
          console.error(
              `[Yapp WS] ${eventType} listener error:`,
              error
          );
        }
      });
}

// ============================================================
// CONNECT
// ============================================================

export function connectSocket(token) {
  // Already connected/connecting
  if (
      client &&
      (status === "connected" ||
          status === "connecting" ||
          status === "reconnecting")
  ) {
    return;
  }

  setStatus("connecting");

  client = new Client({
    webSocketFactory:
        CONFIG.WS_TRANSPORT === "raw"
            ? () =>
                new WebSocket(
                    CONFIG.WS_URL.replace(
                        /^http/,
                        "ws"
                    )
                )
            : () => new SockJS(CONFIG.WS_URL),

    connectHeaders: token
        ? {
          Authorization: `Bearer ${token}`,
        }
        : {},

    reconnectDelay:
    CONFIG.WS_RECONNECT_DELAY,

    // ----------------------------------------------------------
    // CONNECTED
    // ----------------------------------------------------------

    onConnect: () => {


      setStatus("connected");

      resubscribeAll();
    },

    // ----------------------------------------------------------
    // SOCKET CLOSED
    // ----------------------------------------------------------

    onWebSocketClose: () => {


      liveSubscriptions.clear();

      if (status !== "disconnected") {
        setStatus("reconnecting");
      }
    },

    // ----------------------------------------------------------
    // STOMP ERROR
    // ----------------------------------------------------------

    onStompError: (frame) => {
      console.error(
          "[Yapp WS] STOMP ERROR",
          frame
      );

      if (status !== "disconnected") {
        setStatus("reconnecting");
      }
    },
  });

  client.activate();
}

// ============================================================
// DISCONNECT
// ============================================================

export function disconnectSocket() {


  liveSubscriptions.forEach(
      (subscription) => {
        try {
          subscription.unsubscribe();
        } catch {
          // Ignore invalid subscriptions
        }
      }
  );

  liveSubscriptions.clear();

  desiredConversationSubs.clear();

  client?.deactivate();

  client = null;

  setStatus("disconnected");
}

// ============================================================
// CONVERSATION SUBSCRIPTION
// ============================================================

export function subscribeToConversation(
    conversationId
) {
  if (!conversationId) return;

  desiredConversationSubs.add(
      conversationId
  );



  // If already connected, subscribe immediately.
  if (
      client &&
      status === "connected"
  ) {
    subscribeConversation(
        conversationId
    );
  }
}

export function unsubscribeFromConversation(
    conversationId
) {
  if (!conversationId) return;

  desiredConversationSubs.delete(
      conversationId
  );

  const destination =
      D.conversationTopic(
          conversationId
      );

  const subscription =
      liveSubscriptions.get(
          destination
      );

  if (subscription) {
    try {
      subscription.unsubscribe();
    } catch {
      // Ignore invalid subscription
    }

    liveSubscriptions.delete(
        destination
    );
  }


}

// ============================================================
// RESUBSCRIBE AFTER CONNECT / RECONNECT
// ============================================================

function resubscribeAll() {
  // Clear stale handles.
  liveSubscriptions.clear();

  // Fixed per-user queues
  subscribeDestination(
      D.QUEUE_MESSAGES,
      (body) => {
        emit("MESSAGE", body);
      }
  );

  subscribeDestination(
      D.QUEUE_TYPING,
      (body) => {
        emit("TYPING", body);
      }
  );

  subscribeDestination(
      D.PRESENCE_TOPIC,
      (body) => {
        emit(
            body?.online
                ? "USER_ONLINE"
                : "USER_OFFLINE",
            body
        );
      }
  );

  subscribeDestination(
      D.QUEUE_MESSAGE_STATUS,
      (body) => {
        emit("MESSAGE_STATUS", body);
      }
  );

  subscribeDestination(
      D.QUEUE_NOTIFICATIONS,
      (body) => {
        emit(
            "NOTIFICATION",
            body
        );
      }
  );

  // Conversation-specific subscriptions
  desiredConversationSubs.forEach(
      (conversationId) => {
        subscribeConversation(
            conversationId
        );
      }
  );
}

// ============================================================
// SUBSCRIBE TO ONE CONVERSATION
// ============================================================

function subscribeConversation(
    conversationId
) {
  const destination =
      D.conversationTopic(
          conversationId
      );

  subscribeDestination(
      destination,
      (body) => {


        // --------------------------------------------------------
        // REACTION
        // --------------------------------------------------------

        if (
            body?.action === "ADD" ||
            body?.action === "REMOVE"
        ) {


          emit(
              "REACTION",
              body
          );

          return;
        }

        // --------------------------------------------------------
        // NORMAL CONVERSATION EVENT
        // --------------------------------------------------------

        emit(
            "MESSAGE",
            body
        );
      }
  );
}

// ============================================================
// GENERIC SUBSCRIBE
// ============================================================

function subscribeDestination(
    destination,
    handler
) {
  if (!client) {
    console.warn(
        "[Yapp WS] Cannot subscribe — no client"
    );

    return;
  }

  if (
      liveSubscriptions.has(
          destination
      )
  ) {
    return;
  }


  const subscription =
      client.subscribe(
          destination,
          (frame) => {
            try {
              const body =
                  JSON.parse(
                      frame.body
                  );

              handler(body);
            } catch (error) {
              console.error(
                  "[Yapp WS] Failed to parse frame:",
                  frame.body,
                  error
              );
            }
          }
      );

  liveSubscriptions.set(
      destination,
      subscription
  );
}

// ============================================================
// OUTBOUND
// ============================================================

function publish(
    destination,
    body
) {
  if (
      !client ||
      status !== "connected"
  ) {
    console.error(
        "[Yapp WS] NOT CONNECTED",
        {
          destination,
          status,
        }
    );

    return;
  }

  client.publish({
    destination,
    body: JSON.stringify(body),
  });
}

// ============================================================
// CHAT
// ============================================================

export const sendChatMessage =
    (payload) =>
        publish(
            D.SEND_MESSAGE,
            payload
        );

// ============================================================
// TYPING
// ============================================================

export const emitTyping = (
    conversationId,
    typing
) =>
    publish(
        D.SEND_TYPING,
        {
          conversationId,
          typing,
        }
    );

// ============================================================
// READ
// ============================================================

export const emitMessageRead = (
    conversationId,
    messageId
) =>
    publish(
        D.SEND_READ,
        {
          conversationId,
          messageId,
        }
    );