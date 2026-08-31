import React, { useEffect, useRef, useState } from "react";
import "./EmojiPicker.css";

// A small curated set grouped loosely by category — enough to be useful
// without pulling in a full emoji-data package. Swap for a proper dataset
// later if you want search/skin-tones/recently-used; the popover shell and
// wiring here would stay the same.
const CATEGORIES = [
  {
    label: "Smileys",
    emojis: ["😀", "😂", "🥹", "😉", "😍", "🥰", "😘", "😎", "🤔", "🙄", "😅", "😭", "😤", "🥳", "😴", "🤯"],
  },
  {
    label: "Gestures",
    emojis: ["👍", "👎", "🙏", "👏", "🙌", "🤝", "✌️", "🤞", "👌", "🫡", "💪", "👋"],
  },
  {
    label: "Hearts",
    emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "💔", "💯"],
  },
  {
    label: "Objects",
    emojis: ["🔥", "✨", "🎉", "🎂", "☕", "🍕", "😂", "📎", "📷", "🎬", "🎮", "⚽"],
  },
];

export default function EmojiPicker({ onSelect, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose?.();
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div className="emoji-picker" ref={ref}>
      {CATEGORIES.map((cat) => (
        <div className="emoji-category" key={cat.label}>
          <p className="emoji-category-label">{cat.label}</p>
          <div className="emoji-grid">
            {cat.emojis.map((emoji, i) => (
              <button
                key={`${cat.label}-${i}`}
                className="emoji-option"
                onClick={() => onSelect(emoji)}
                aria-label={emoji}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
