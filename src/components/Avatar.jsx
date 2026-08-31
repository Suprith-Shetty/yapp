import React, { useState } from "react";
import "./Avatar.css";

// Renders the user's profilePictureUrl if present; otherwise falls back
// to the first letter of their username in a circular tinted badge.
// This fallback is entirely frontend-side — nothing is persisted or
// requested from the backend for it (per the build spec: no random-
// avatar backend system).
const PALETTE = ["#5865f2", "#23a55a", "#f0b232", "#6fb2ff", "#eb6f9c", "#7c5cff"];

function colorFor(seed) {
  if (!seed) return PALETTE[0];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

export default function Avatar({ src, name, size = 40, online, className = "", ringed = false }) {
  const [failed, setFailed] = useState(false);
  const showImage = src && !failed;
  const initial = (name || "?").trim()[0]?.toUpperCase() || "?";

  return (
    <span
      className={`avatar-wrap-standalone ${className}`}
      style={{ width: size, height: size }}
    >
      {showImage ? (
        <img
          src={src}
          alt=""
          className={`avatar-img ${ringed ? "ringed" : ""}`}
          onError={() => setFailed(true)}
        />
      ) : (
        <span
          className={`avatar-initial ${ringed ? "ringed" : ""}`}
          style={{ background: colorFor(name), fontSize: size * 0.42 }}
          aria-hidden="true"
        >
          {initial}
        </span>
      )}
      {online !== undefined && <span className={`avatar-presence ${online ? "online" : "offline"}`} />}
    </span>
  );
}
