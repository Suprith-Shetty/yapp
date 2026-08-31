import React, { useRef, useState, useCallback } from "react";
import * as api from "../services/api.js";
import { CONFIG } from "../config.js";
import EmojiPicker from "./EmojiPicker.jsx";
import "./Composer.css";

function classifyFile(file) {
  if (CONFIG.ALLOWED_IMAGE_TYPES.includes(file.type)) return "image";
  if (CONFIG.ALLOWED_VIDEO_TYPES.includes(file.type)) return "video";
  return "file"; // backend accepts any type as a generic "raw" upload
}

function maxMbFor(kind) {
  if (kind === "image") return CONFIG.MAX_IMAGE_MB;
  if (kind === "video") return CONFIG.MAX_VIDEO_MB;
  return CONFIG.MAX_FILE_MB;
}

// The file-upload endpoint (POST /api/files/upload) uploads AND sends
// the chat message in one call — there's no separate "stage, then
// send" step the way a text message has. So once an attachment starts
// uploading, its progress bar *is* the send; on success the message is
// already delivered and this composer just clears itself.
export default function Composer({ conversationId, peerName, replyTo, onCancelReply, onSendText, onFileSent, onTyping, onStopTyping }) {
  const [text, setText] = useState("");
  const [attachment, setAttachment] = useState(null); // {file, kind, previewUrl, status, progress, error, controller}
  const [showEmoji, setShowEmoji] = useState(false);
  const typingTimeout = useRef(null);
  const mediaInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  const handleChange = (e) => {
    setText(e.target.value);
    onTyping?.();
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => onStopTyping?.(), 1200);
  };

  const insertEmoji = useCallback(
    (emoji) => {
      const el = textareaRef.current;
      if (!el) {
        setText((t) => t + emoji);
        return;
      }
      const start = el.selectionStart ?? text.length;
      const end = el.selectionEnd ?? text.length;
      const next = text.slice(0, start) + emoji + text.slice(end);
      setText(next);
      onTyping?.();
      requestAnimationFrame(() => {
        el.focus();
        const caret = start + emoji.length;
        el.setSelectionRange(caret, caret);
      });
    },
    [text, onTyping]
  );

  const startUpload = useCallback(
    (file) => {
      const kind = classifyFile(file);

      if (file.size > maxMbFor(kind) * 1024 * 1024) {
        setAttachment({ file, kind, status: "error", error: `File is too large.`, progress: 0 });
        return;
      }

      const controller = new AbortController();
      const previewUrl = kind === "image" || kind === "video" ? URL.createObjectURL(file) : null;
      setAttachment({ file, kind, previewUrl, status: "uploading", progress: 0, controller });

      // The current composer text (if any) is sent along as the caption —
      // this is a reply-to-a-file limitation, not a bug: saveFileMessage
      // has no replyToMessageId parameter on the backend, so an active
      // reply is intentionally not carried over for file/image/video sends.
      api
        .uploadFileMessage(file, conversationId, text.trim() || undefined, {
          signal: controller.signal,
          onProgress: (pct) => setAttachment((a) => (a ? { ...a, progress: pct } : a)),
        })
        .then((result) => {
          setAttachment(null);
          setText("");
          if (attachment?.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
          onFileSent(result);
        })
        .catch((err) => {
          setAttachment((a) => (a ? { ...a, status: "error", error: err.friendly || "File upload failed. Please try again." } : a));
        });
    },
    [conversationId, text, onFileSent, attachment?.previewUrl]
  );

  const handleFiles = (fileList) => {
    const file = fileList?.[0];
    if (file) startUpload(file);
  };

  const cancelAttachment = () => {
    attachment?.controller?.abort();
    if (attachment?.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
    setAttachment(null);
  };

  const retryAttachment = () => {
    if (attachment?.file) startUpload(attachment.file);
  };

  const submitText = () => {
    const trimmed = text.trim();
    if (!trimmed || attachment) return; // an attachment send never coexists with a plain text send
    onSendText(trimmed, replyTo?.messageId || null);
    setText("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitText();
    }
  };

  const uploading = attachment?.status === "uploading";

  return (
    <div className="composer">
      {replyTo && (
        <div className="composer-reply">
          <div className="composer-reply-text">
            <span className="composer-reply-label">Replying to {replyTo.senderUserName || peerName || "message"}</span>
            <span className="composer-reply-quote">
              {replyTo.messageType === "FILE" ? filePreviewLabel(replyTo) : replyTo.content}
            </span>
          </div>
          <button className="composer-reply-cancel" onClick={onCancelReply} aria-label="Cancel reply">
            ✕
          </button>
        </div>
      )}

      {attachment && (
        <div className="attachment-strip">
          <AttachmentPreview attachment={attachment} onCancel={cancelAttachment} onRetry={retryAttachment} />
        </div>
      )}

      <input
        ref={mediaInputRef}
        type="file"
        accept="image/*,video/*"
        className="visually-hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={fileInputRef}
        type="file"
        className="visually-hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <div className="composer-bar">
        <button
          className="composer-icon-btn"
          aria-label="Attach image or video"
          onClick={() => mediaInputRef.current?.click()}
          disabled={uploading}
        >
          <ImageIcon />
        </button>
        <button className="composer-icon-btn" aria-label="Attach file" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          <PaperclipIcon />
        </button>

        <textarea
          ref={textareaRef}
          rows={1}
          placeholder={attachment ? "Add a caption…" : `Message ${peerName || "..."}...`}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />

        <div className="emoji-btn-wrap">
          <button className={`composer-icon-btn ${showEmoji ? "active" : ""}`} aria-label="Emoji" onClick={() => setShowEmoji((s) => !s)}>
            <SmileIcon />
          </button>
          {showEmoji && <EmojiPicker onSelect={insertEmoji} onClose={() => setShowEmoji(false)} />}
        </div>

        <button className="composer-send" aria-label="Send message" onClick={submitText} disabled={!text.trim() || !!attachment}>
          <SendIcon />
        </button>
      </div>
    </div>
  );
}

function filePreviewLabel(message) {
  if (/\.(png|jpe?g|gif|webp)$/i.test(message.fileName || "") || (message.fileType || "").startsWith("image/")) return "📷 Image";
  if (/\.(mp4|webm|mov)$/i.test(message.fileName || "") || (message.fileType || "").startsWith("video/")) return "🎥 Video";
  return `📎 ${message.fileName || "File"}`;
}

function AttachmentPreview({ attachment, onCancel, onRetry }) {
  const { kind, file, previewUrl, status, progress, error } = attachment;
  return (
    <div className={`attach-card ${status}`}>
      {kind === "image" && previewUrl && <img src={previewUrl} alt="" className="attach-thumb" />}
      {kind === "video" && previewUrl && (
        <span className="attach-thumb attach-thumb-video">
          <video src={previewUrl} muted />
          <span className="attach-thumb-video-badge">🎥</span>
        </span>
      )}
      {kind === "file" && (
        <span className="attach-file-icon">
          <FileIcon />
        </span>
      )}

      <div className="attach-meta">
        <span className="attach-name">{file.name}</span>
        {status === "uploading" && (
          <>
            <span className="attach-size">Uploading… {progress}%</span>
            <div className="attach-progress-track">
              <div className="attach-progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </>
        )}
        {status === "error" && <span className="attach-error">{error}</span>}
      </div>

      <div className="attach-actions">
        {status === "error" ? (
          <button className="attach-action-btn" onClick={onRetry} aria-label="Retry upload">
            <RetryIcon />
          </button>
        ) : null}
        <button className="attach-action-btn" onClick={onCancel} aria-label="Remove attachment">
          ✕
        </button>
      </div>
    </div>
  );
}

function ImageIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path d="M21 16l-5.5-5.5L4 21" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function PaperclipIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M21 11L12 20a4 4 0 01-6-6l9-9a2.8 2.8 0 014 4l-9 9a1.3 1.3 0 01-2-2l8-8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function SmileIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" strokeLinecap="round" />
      <path d="M9 9h.01M15 9h.01" strokeLinecap="round" strokeWidth="2.4" />
    </svg>
  );
}
function SendIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 2L11 13" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function FileIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" strokeLinejoin="round" />
      <path d="M14 2v6h6" strokeLinejoin="round" />
    </svg>
  );
}
function RetryIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 12a9 9 0 019-9c2.4 0 4.6.9 6.2 2.5L21 8M21 3v5h-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
