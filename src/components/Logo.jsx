import React from "react";
import "./Logo.css";

/**
 * The Yapp mark: two overlapping speech bubbles (the universal "two people
 * chatting" shape) with the front bubble holding a continuously animated
 * three-dot typing indicator. Used on the splash, the icon rail, and the
 * auth page. `size` scales the whole mark proportionally.
 */
export default function Logo({ size = 44 }) {
  return (
    <div className="yapp-logo" style={{ width: size, height: size * 0.86 }}>
      <span className="yapp-logo-back" />
      <span className="yapp-logo-front">
        <span className="yapp-dot" />
        <span className="yapp-dot" />
        <span className="yapp-dot" />
      </span>
    </div>
  );
}
