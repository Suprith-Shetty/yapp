# Yapp

Yapp is a real-time chat application backend built with Spring Boot. It supports one-to-one messaging over WebSocket (STOMP), JWT-based authentication, typing indicators, read receipts, message reactions, file/image sharing via Cloudinary, and online presence tracking.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture Overview](#architecture-overview)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Variables](#environment-variables)
  - [Running the Application](#running-the-application)
- [REST API](#rest-api)
- [WebSocket API](#websocket-api)
- [Security Model](#security-model)
- [Project Structure](#project-structure)
- [Roadmap](#roadmap)
- [Author](#author)

## Features

- **Authentication** — username/password registration and login, passwords hashed with BCrypt, stateless JWT-based sessions.
- **Real-time messaging** — one-to-one chat delivered over WebSocket using STOMP, with per-user message queues.
- **Typing indicators** — live "user is typing" events broadcast to other conversation members.
- **Read receipts** — message status tracking (`SENT`, `DELIVERED`, `READ`) with per-conversation unread counts.
- **Message reactions** — emoji reactions on messages with real-time add/remove events broadcast to the conversation.
- **File & image sharing** — file uploads stored on Cloudinary, with per-user rate limiting.
- **Reply-to messages** — messages can reference and quote an earlier message in the same conversation.
- **Presence tracking** — online/offline status and last-seen timestamps, updated on WebSocket connect/disconnect.
- **User search & profiles** — search users by username, view and update profile details and profile pictures.

## Tech Stack

- **Language / Framework:** Java, Spring Boot
- **Security:** Spring Security, OAuth2 Resource Server (JWT via Nimbus)
- **Real-time layer:** Spring WebSocket + STOMP messaging (SockJS fallback)
- **Persistence:** Spring Data JPA / Hibernate
- **File storage:** Cloudinary
- **Utilities:** Lombok

> The repository doesn't pin a specific build tool or database driver in the files reviewed — adjust the setup steps below to match your `pom.xml`/`build.gradle` and chosen relational database (e.g. PostgreSQL, MySQL).

## Architecture Overview

- **Controllers** expose REST endpoints (`/api/**`) for auth, users, conversations, reactions, and file uploads, and STOMP message-mapped handlers (`/app/**`) for chat, typing, and read events.
- **Services** contain the business logic — membership checks, message persistence, presence updates, and reaction handling — keeping controllers thin.
- **WebSocket layer** authenticates STOMP `CONNECT` frames via a bearer JWT in a `WebSocketAuthInterceptor`, then routes messages to per-user queues (`/user/queue/**`) and per-conversation topics (`/topic/conversations.{id}`).
- **Security layer** uses two ordered filter chains: one permissive chain scoped to `/ws/**` (since WebSocket auth is handled at the STOMP level instead), and a standard JWT-authenticated chain for all other `/api/**` routes.

## Getting Started

### Prerequisites

- JDK 17+
- A relational database supported by Spring Data JPA
- A [Cloudinary](https://cloudinary.com/) account (cloud name, API key, API secret)

### Environment Variables

Configure the following properties (e.g. in `application.yml` or as environment variables):

| Property | Description |
|---|---|
| `cloudinary.cloud-name` | Cloudinary cloud name |
| `cloudinary.api-key` | Cloudinary API key |
| `cloudinary.api-secret` | Cloudinary API secret |
| `jwt.secret` | Base64-encoded HMAC secret used to sign/verify JWTs |
| `app.frontend-url` | Allowed CORS / WebSocket origin (your frontend's URL) |
| Database connection properties | `spring.datasource.*` per your chosen database |

### Running the Application

```bash
# clone the repository
git clone <repository-url>
cd yapp

# build and run (Maven example)
./mvnw spring-boot:run

# or (Gradle example)
./gradlew bootRun
```

The application exposes REST endpoints under `/api/**` and a STOMP WebSocket endpoint at `/ws`.

## REST API

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/auth/register` | Register a new user | Public |
| POST | `/api/auth/login` | Log in and receive a JWT | Public |
| GET | `/api/users/search?username=` | Search users by username | Required |
| GET | `/api/users/{userId}/presence` | Get a user's online status and last-seen | Required |
| GET | `/api/users/{userId}/profile` | Get a user's public profile | Required |
| POST | `/api/users/me/profile-picture` | Upload/replace your profile picture | Required |
| DELETE | `/api/users/me/profile-picture` | Remove your profile picture | Required |
| POST | `/api/conversations/direct/{userId}` | Create or fetch a direct conversation with a user | Required |
| GET | `/api/conversations` | List your conversations | Required |
| GET | `/api/conversations/{conversationId}/messages` | Get message history for a conversation | Required |
| GET | `/api/conversations/{conversationId}/unread` | Get unread message count | Required |
| PUT | `/api/conversations/{conversationId}/read` | Mark a conversation as read | Required |
| POST | `/api/files/upload` | Upload a file/image to a conversation | Required |
| GET | `/api/files/{messageId}` | Get the URL of an uploaded file | Required |
| POST | `/api/reactions/message/{messageId}` | Add or update a reaction on a message | Required |
| DELETE | `/api/reactions/message/{messageId}?emoji=` | Remove your reaction from a message | Required |
| GET | `/api/reactions/conversation/{conversationId}` | List reactions for a conversation | Required |

## WebSocket API

Connect to `/ws` (SockJS-compatible) and authenticate by sending a `Bearer <token>` value in the `Authorization` STOMP header on `CONNECT`.

| Destination | Direction | Description |
|---|---|---|
| `/app/chat` | Client → Server | Send a chat message |
| `/app/typing` | Client → Server | Broadcast a typing indicator |
| `/app/read` | Client → Server | Mark a specific message as read |
| `/user/queue/messages` | Server → Client | Incoming/outgoing chat messages |
| `/user/queue/message-status` | Server → Client | Message status updates (sent/read) |
| `/user/queue/typing` | Server → Client | Typing indicator events from other members |
| `/topic/conversations.{conversationId}` | Server → Client | Reaction add/remove events for a conversation |

## Security Model

- Passwords are hashed with **BCrypt**.
- Sessions are stateless, backed by **HMAC-signed JWTs** (1 hour expiry), carrying the user's ID, username, and role.
- WebSocket connections are authenticated per-`CONNECT` frame rather than at the HTTP handshake, allowing the SockJS handshake endpoint to stay open while still requiring a valid token to establish a STOMP session.
- Conversation and message-level actions (sending messages, reacting, reading, uploading files) all verify conversation membership before proceeding.

## Project Structure

```
in.yapp
├── Config          # Cloudinary, WebSocket, and related configuration
├── Controller       # REST controllers and STOMP message-mapped handlers
├── DTO              # Request/response and event payloads
├── Entity           # JPA entities (User, Conversation, Message, etc.)
├── Exceptions       # Custom application exceptions and error codes
├── Repository       # Spring Data JPA repositories
├── Security         # JWT auth, UserDetails, and security configuration
├── Service          # Business logic
└── WebSocket        # Presence and STOMP session event listeners
```

## Roadmap

- Group conversation support (the data model already includes a `GROUP` conversation type)
- Message editing and deletion
- Push notifications for offline users

## Author

<div align="center">

<img src="https://github.com/Suprith-Shetty.png" width="120" alt="Suprith Shetty"/>

### Hey, I'm Suprith 👋

Focused on **AI/ML** and **backend development** — open to collaborate.

**Suprith Shetty**

[GitHub](https://github.com/Suprith-Shetty) · [LinkedIn](https://www.linkedin.com/in/suprith-shetty-991109379/) · [Email](mailto:shettysuprith04@gmail.com)

</div>
