import React from "react";
import "./EmptyConversation.css";

export default function EmptyConversation() {
  return (
    <div className="empty-conv">
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
        <path
          d="M8 16a6 6 0 016-6h28a6 6 0 016 6v18a6 6 0 01-6 6H24l-10 8v-8a6 6 0 01-6-6V16z"
          stroke="var(--border-strong)"
          strokeWidth="2"
        />
        <circle cx="20" cy="24" r="1.8" fill="var(--accent)" />
        <circle cx="28" cy="24" r="1.8" fill="var(--accent)" />
        <circle cx="36" cy="24" r="1.8" fill="var(--accent)" />
      </svg>
      <p className="empty-title">Your conversations live here</p>
      <p className="empty-sub">Pick someone from the left, or start a new chat.</p>
    </div>
  );
}
