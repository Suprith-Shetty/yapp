import React, { useState, useEffect, useCallback } from "react";
import * as api from "../services/api.js";
import "./MessageAttachment.css";

function kindFor(fileType, fileName) {
  const type = fileType || "";
  const name = fileName || "";

  if (type.startsWith("image/")) return "image";
  if (type.startsWith("video/")) return "video";
  if (type.startsWith("audio/")) return "audio";

  if (/\.pdf$/i.test(name)) return "pdf";
  if (/\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(name)) return "audio";

  if (/\.(png|jpe?g|gif|webp)$/i.test(name)) return "image";
  if (/\.(mp4|webm|mov)$/i.test(name)) return "video";

  return "file";
}

export default function MessageAttachment({
                                            messageId,
                                            fileUrl,
                                            fileName,
                                            fileType,
                                            fileSize,
                                          }) {
  const kind = kindFor(fileType, fileName);

  const [url, setUrl] = useState(fileUrl || null);
  const [urlState, setUrlState] = useState(fileUrl ? "ready" : "loading");
  const [mediaState, setMediaState] = useState("loading");
  const [viewer, setViewer] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const fetchUrl = useCallback(async () => {
    setUrlState("loading");

    try {
      const resolved = await api.getFileUrl(messageId);
      setUrl(resolved);
      setUrlState("ready");
    } catch {
      setUrlState("error");
    }
  }, [messageId]);

  useEffect(() => {
    if (!fileUrl) {
      fetchUrl();
    }
  }, [fileUrl, fetchUrl]);

  const retry = () => {
    setMediaState("loading");
    setRetryKey((k) => k + 1);

    if (!fileUrl) {
      fetchUrl();
    }
  };

  if (urlState === "loading") {
    return (
        <div className={`attach-media-placeholder ${kind}`}>
          Loading {kind === "video" ? "video" : "media"}…
        </div>
    );
  }

  if (urlState === "error" || !url) {
    return (
        <div className="attach-media-error">
          <span>Unable to load media.</span>
          <button className="attach-retry-btn" onClick={retry}>
            Retry
          </button>
        </div>
    );
  }

  // ============================================================
  // IMAGE
  // ============================================================

  if (kind === "image") {
    return (
        <>
          <button
              className="attach-msg-image-btn"
              onClick={() => mediaState === "loaded" && setViewer(true)}
          >
            {mediaState === "loading" && (
                <div className="attach-media-placeholder image">
                  Loading image…
                </div>
            )}

            {mediaState === "error" && (
                <div className="attach-media-error">
                  <span>Unable to load media.</span>

                  <button
                      className="attach-retry-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        retry();
                      }}
                  >
                    Retry
                  </button>
                </div>
            )}

            <img
                key={retryKey}
                src={url}
                alt={fileName || "image"}
                className="attach-msg-image"
                style={{
                  display: mediaState === "loaded" ? "block" : "none",
                }}
                onLoad={() => setMediaState("loaded")}
                onError={() => setMediaState("error")}
            />
          </button>

          {viewer && (
              <div
                  className="attachment-viewer"
                  onClick={() => setViewer(false)}
              >
                <button
                    className="attachment-viewer-close"
                    onClick={() => setViewer(false)}
                    aria-label="Close"
                >
                  ×
                </button>

                <img
                    src={url}
                    alt={fileName || "image"}
                    className="attachment-viewer-image"
                    onClick={(e) => e.stopPropagation()}
                />
              </div>
          )}
        </>
    );
  }

  // ============================================================
  // VIDEO
  // ============================================================

  if (kind === "video") {
    return (
        <div className="attach-msg-video-wrap">
          {mediaState === "loading" && (
              <div className="attach-media-placeholder video">
                🎥 Loading video…
              </div>
          )}

          {mediaState === "error" && (
              <div className="attach-media-error">
                <span>Unable to load media.</span>

                <button className="attach-retry-btn" onClick={retry}>
                  Retry
                </button>
              </div>
          )}

          <video
              key={retryKey}
              src={url}
              controls
              preload="metadata"
              className="attach-msg-video"
              style={{
                display: mediaState === "loaded" ? "block" : "none",
              }}
              onLoadedData={() => setMediaState("loaded")}
              onError={() => setMediaState("error")}
          />

          {mediaState === "loaded" && (
              <div className="attach-msg-video-meta">
                {fileName} {fileSize ? `· ${formatBytes(fileSize)}` : ""}
              </div>
          )}
        </div>
    );
  }

  // ============================================================
  // PDF
  // ============================================================

  if (kind === "pdf") {
    return (
        <>
          <button
              className="attach-msg-file"
              onClick={() => setViewer(true)}
          >
          <span className="attach-msg-file-icon">
            <PdfIcon />
          </span>

            <span className="attach-msg-file-meta">
            <span className="attach-msg-file-name">
              {fileName || "PDF"}
            </span>

            <span className="attach-msg-file-size">
              {fileSize ? formatBytes(fileSize) : "Open PDF"}
            </span>
          </span>

            <span className="attach-msg-file-download">
            Open
          </span>
          </button>

          {viewer && (
              <div className="attachment-viewer pdf-viewer">
                <div className="attachment-viewer-header">
                  <span>{fileName || "PDF"}</span>

                  <button
                      className="attachment-viewer-close"
                      onClick={() => setViewer(false)}
                      aria-label="Close"
                  >
                    ×
                  </button>
                </div>

                <iframe
                    key={retryKey}
                    src={url}
                    title={fileName || "PDF document"}
                    className="attachment-pdf"
                />
              </div>
          )}
        </>
    );
  }

  // ============================================================
  // AUDIO / MP3
  // ============================================================

  if (kind === "audio") {
    return (
        <>
          <button
              className="attach-msg-file"
              onClick={() => setViewer(true)}
          >
          <span className="attach-msg-file-icon">
            <AudioIcon />
          </span>

            <span className="attach-msg-file-meta">
            <span className="attach-msg-file-name">
              {fileName || "Audio"}
            </span>

            <span className="attach-msg-file-size">
              {fileSize ? formatBytes(fileSize) : "Play audio"}
            </span>
          </span>

            <span className="attach-msg-file-download">
            ▶
          </span>
          </button>

          {viewer && (
              <div
                  className="attachment-viewer audio-viewer"
                  onClick={() => setViewer(false)}
              >
                <div
                    className="audio-viewer-card"
                    onClick={(e) => e.stopPropagation()}
                >
                  <button
                      className="attachment-viewer-close"
                      onClick={() => setViewer(false)}
                      aria-label="Close"
                  >
                    ×
                  </button>

                  <AudioIcon />

                  <div className="audio-viewer-name">
                    {fileName || "Audio"}
                  </div>

                  <audio
                      key={retryKey}
                      src={url}
                      controls
                      autoPlay
                      className="attachment-audio"
                  />
                </div>
              </div>
          )}
        </>
    );
  }

  // ============================================================
  // OTHER FILES
  // ============================================================

  return (
      <a
          className="attach-msg-file"
          href={url}
          download={fileName || true}
      >
      <span className="attach-msg-file-icon">
        <FileIcon />
      </span>

        <span className="attach-msg-file-meta">
        <span className="attach-msg-file-name">
          {fileName || "file"}
        </span>

        <span className="attach-msg-file-size">
          {fileSize ? formatBytes(fileSize) : "Download"}
        </span>
      </span>

        <span className="attach-msg-file-download">
        <DownloadIcon />
      </span>
      </a>
  );
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon() {
  return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path
            d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"
            strokeLinejoin="round"
        />
        <path d="M14 2v6h6" strokeLinejoin="round" />
      </svg>
  );
}

function PdfIcon() {
  return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path
            d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"
            strokeLinejoin="round"
        />
        <path d="M14 2v6h6" strokeLinejoin="round" />
        <path d="M8 15h8M8 18h6" strokeLinecap="round" />
      </svg>
  );
}

function AudioIcon() {
  return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M9 18V6l10-2v12" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="16" cy="16" r="3" />
      </svg>
  );
}

function DownloadIcon() {
  return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
        <path
            d="M12 3v12M7 10l5 5 5-5M4 21h16"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
      </svg>
  );
}