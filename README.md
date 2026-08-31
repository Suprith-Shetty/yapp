# Yapp — Frontend

A warm, human real-time messaging UI built with React + Vite. Ships with mock
data so it's fully demoable standalone, and a clean service layer so a Spring
Boot backend can be dropped in without touching any component.

## Running it

```bash
npm install
npm run dev
```

Open the printed local URL. The app boots straight into the login/signup
screen — any email + password combination works while mocks are on.

## Project shape

```
src/
  config.js                   # API base URL, WS URL, STOMP destinations, USE_MOCKS,
                               # upload limits/allowed types
  services/
    api.js                    # REST calls — every function documents its endpoint
    socket.js                 # STOMP client — connect/subscribe/publish/reconnect
    browserNotifications.js   # opt-in system notifications, permission-aware
  context/
    AuthContext.jsx           # session state, refresh-persistence, login/register/logout
  data/mockData.js            # in-memory data used while USE_MOCKS = true
  pages/
    AuthPage.jsx               # landing + login + signup
    ChatApp.jsx                 # app shell: icon rail, sidebar, conversation area,
                                 # global real-time event handling
  components/
    IconRail.jsx, Sidebar.jsx, ConversationView.jsx, MessageGroup.jsx,
    Composer.jsx, MessageAttachment.jsx  — core chat UI
    NewChatModal.jsx, CreateGroupModal.jsx, GroupMembersPanel.jsx,
    UserPicker (shared CSS)              — group/DM creation & management
    ProfilePanel.jsx, NotificationsDropdown.jsx, ConnectionBanner.jsx,
    RoomsPanel.jsx, Logo.jsx, SplashScreen.jsx
```

## Connecting the Spring Boot backend

1. In `src/config.js`, set `USE_MOCKS` to `false` and point `API_BASE_URL` /
   `WS_URL` at your backend (or wire them via `.env` — `VITE_API_BASE_URL`,
   `VITE_WS_URL`, `VITE_WS_TRANSPORT`).
2. **STOMP destinations** — also in `src/config.js`, under
   `STOMP_DESTINATIONS`. This is the single source of truth for every
   subscribe/publish call; rename the strings to match whatever your
   `@MessageMapping`/broker config actually registers and nothing else in
   the app needs to change. Current assumptions (Spring's conventional
   `/app` + `/topic` + `/user` prefixes):
   - Outbound: `/app/chat.send`, `/app/chat.typing`, `/app/chat.stopTyping`, `/app/chat.read`
   - Inbound (per-user queues — requires an authenticated STOMP principal):
     `/user/queue/messages`, `/user/queue/typing`, `/user/queue/presence`,
     `/user/queue/delivery`, `/user/queue/read-receipts`, `/user/queue/notifications`
   - Inbound (per-conversation topic): `/topic/conversations.{id}`
3. `services/socket.js` uses `@stomp/stompjs` + `sockjs-client` against the
   SockJS endpoint your backend registers via `.withSockJS()`. If it's a raw
   WebSocket endpoint instead, set `VITE_WS_TRANSPORT=raw`. Reconnection is
   automatic (`@stomp/stompjs`'s own retry loop) and every standing
   subscription — the fixed per-user queues plus whichever conversations are
   currently open — is re-established from a clean slate on every
   reconnect, so duplicate subscriptions can't accumulate.
4. `services/api.js` covers the full REST surface: auth, users/search,
   conversations, group management (members/add/remove/leave/rename),
   messages with cursor pagination (`?before=&limit=`), file upload
   (`POST /files/upload`, multipart, via `XMLHttpRequest` so upload
   progress events are available), and notifications
   (`read`/`read-all`). Every function documents its endpoint inline.
5. Auth token is stored in `localStorage` under `yapp_token`, attached as a
   Bearer header automatically by `services/api.js`, and passed as a STOMP
   connect header. On page refresh, `AuthContext` validates a saved token
   against `GET /users/me` before restoring the session — it doesn't trust
   the stored token blindly.

No component imports mock data directly — everything goes through
`services/`, so flipping `USE_MOCKS` is a config change, not a rewrite.

## Design notes (v5 — full feature build against the Spring Boot spec)

Built out against a detailed backend-integration spec: JWT auth with
refresh-persistence, real STOMP lifecycle (auto-connect/subscribe/
reconnect/disconnect, no manual controls anywhere in the UI), 1:1 + group
messaging, typing indicators, presence, delivery/read receipts, image/
video/file attachments via multipart upload (never through STOMP), and a
real notification system. Highlights:

- **Delivery/read status is never faked** once `USE_MOCKS` is off — ticks
  only ever update from `MESSAGE_DELIVERED` / `MESSAGE_READ` socket events.
  The mock path's fake timers are explicitly gated behind `CONFIG.USE_MOCKS`
  so there's no risk of that logic leaking into the real path.
- **Attachments** (`Composer.jsx`) — type/size validated client-side against
  `CONFIG.ALLOWED_*_TYPES` / `MAX_*_MB` before upload starts, per-file
  preview + progress bar, cancel via `AbortController`, retry, and the send
  button stays disabled until every pending upload resolves — the frontend
  never assumes a send succeeded.
- **Groups** — two-step create flow (`CreateGroupModal.jsx`: pick members →
  name the group), a members panel (`GroupMembersPanel.jsx`) with
  owner-gated rename/remove, an add-members sub-flow, and leave-group.
- **Notifications** — real mark-read/mark-all-read against the backend,
  click-through to the relevant conversation, plus opt-in browser/system
  notifications (`services/browserNotifications.js`) that never assume
  permission — the toggle lives in the profile panel and reflects the
  browser's actual `Notification.permission` state.
- **Unread counts and conversation ordering** update live off the `MESSAGE`
  socket event — incrementing only when the conversation isn't the one
  currently open, and re-sorting the list by most-recent activity.
- Loading states throughout: skeleton rows while conversations load, a
  connection banner for connecting/reconnecting/connected, per-attachment
  upload progress, disabled buttons during in-flight creates/renames/adds.

## Design notes (v4 — Yapp rebrand, Discord-referenced chrome)

- **Renamed Guftagu → Yapp.** "Yapp" leans into current slang ("yapping" =
  talking a lot) while doubling as "app." The mark (`Logo.jsx`) is two
  overlapping speech bubbles — the front one holds a continuously animated
  three-dot typing indicator, so the brand mark itself is always mid-"yap."
- **Splash screen** (`SplashScreen.jsx`) shows the mark + wordmark for
  ~6.5 seconds (tune `LOGO_IN` / `HOLD` / `FADE_OUT` at the top of the file
  to land anywhere in the 5–10s range) before handing off to login. The
  typing dots keep bouncing the entire time it's on screen.
- **App chrome now explicitly references Discord's structure**, not
  WhatsApp's: a slim icon rail on the far left (mark, Chats, Rooms, new
  chat, notifications — active items morph from circle to rounded square
  with a left-edge indicator pill, same interaction Discord uses for its
  server list), a "Direct Messages" section label with an inline add
  button, and a persistent bottom user bar in the sidebar (avatar + status
  + mute/deafen/settings icons) instead of a top header bar.
- **Messages remain a flat grouped stream** (no bubbles) — see the v3 notes
  below, unchanged in this pass.
- One flat accent (`--accent: #5865f2`), no gradients, dark-native surfaces
  layered `--bg-deepest` → `--bg-elevated` → `--bg` → `--surface`.

## Design notes (v3 — flat message stream, no bubbles)



- **Renamed Guftagu → Yapp.** "Yapp" leans into current slang ("yapping" =
  talking a lot) while doubling as "app." The mark (`Logo.jsx`) is two
  overlapping speech bubbles — the front one holds a continuously animated
  three-dot typing indicator, so the brand mark itself is always mid-"yap."
- **Splash screen** (`SplashScreen.jsx`) shows the mark + wordmark for
  ~6.5 seconds (tune `LOGO_IN` / `HOLD` / `FADE_OUT` at the top of the file
  to land anywhere in the 5–10s range) before handing off to login. The
  typing dots keep bouncing the entire time it's on screen.
- **App chrome now explicitly references Discord's structure**, not
  WhatsApp's: a slim icon rail on the far left (mark, Chats, Rooms, new
  chat, notifications — active items morph from circle to rounded square
  with a left-edge indicator pill, same interaction Discord uses for its
  server list), a "Direct Messages" section label with an inline add
  button, and a persistent bottom user bar in the sidebar (avatar + status
  + mute/deafen/settings icons) instead of a top header bar.
- **Messages remain a flat grouped stream** (no bubbles) — see the v3 notes
  below, unchanged in this pass.
- One flat accent (`--accent: #5865f2`), no gradients, dark-native surfaces
  layered `--bg-deepest` → `--bg-elevated` → `--bg` → `--surface`.

## Design notes (v3 — flat message stream, no bubbles)

- **Splash first.** `App.jsx` shows `SplashScreen.jsx` on load: the "Yapp"
  wordmark pops in (Fredoka — a rounded geometric face in the spirit of
  Instagram's current wordmark), holds for a beat, then a paper airplane
  flies across as the "message sent" motif before handing off to login.
  Timing lives at the top of `SplashScreen.jsx` if you want it longer/shorter.
- **No bubbles.** Messages render as a flat, grouped stream — avatar and name
  shown once per consecutive run from the same sender, each message a plain
  text line underneath (`MessageGroup.jsx`). This is the deliberate
  departure from WhatsApp's bubble-per-message layout, closer to
  Discord/Slack's model. Hover reveals a floating react/reply/more toolbar
  instead of a fixed control row.
- **One flat accent, no gradients.** Indigo (`--accent: #5865f2`) used
  sparingly for own-name color, links, primary buttons, and unread badges.
  Dedicated status colors (`--green` online, `--danger`, `--amber`) instead
  of reusing the accent for presence.
- Dark-native throughout — layered Discord-style greys (`--bg-deepest` →
  `--bg-elevated` → `--bg` → `--surface`) rather than a single flat dark
  background, so chrome and content read as distinct depths.
- Fully responsive: below 860px the sidebar and conversation become separate
  screens with a back button.

To retheme, everything routes through the CSS custom properties at the top
of `src/index.css` — change `--accent` to shift the identity color, or the
`--bg*` stack to adjust depth, and it propagates everywhere.
