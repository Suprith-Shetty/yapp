import React from "react";
import "./ModalShell.css";

export default function ModalShell({ title, onClose, children, footer, width = 420 }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-shell" style={{ maxWidth: width }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
