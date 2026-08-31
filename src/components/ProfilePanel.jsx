import React, { useState, useRef } from "react";
import * as browserNotify from "../services/browserNotifications.js";
import * as api from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import Avatar from "./Avatar.jsx";
import ModalShell from "./ModalShell.jsx";
import AvatarCropper from "./AvatarCropper.jsx";
import "./ProfilePanel.css";

export default function ProfilePanel({ user, onClose, onLogout, isSelf = true }) {
  const { refreshProfile } = useAuth();
  const [permission, setPermission] = useState(browserNotify.getPermissionState());
  const [pendingFile, setPendingFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleNotificationToggle = async () => {
    if (permission === "granted") return; // browsers don't let sites revoke their own permission
    const result = await browserNotify.ensurePermission();
    setPermission(result);
  };

  const handleFilePicked = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    setError(null);
    setPendingFile(file);
  };

  const handleCropConfirm = async (croppedFile) => {
    setPendingFile(null);
    setSaving(true);
    setError(null);
    try {
      await api.uploadProfilePicture(croppedFile);
      await refreshProfile();
    } catch (e) {
      setError(e.friendly || "File upload failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleRemovePicture = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.removeProfilePicture();
      await refreshProfile();
    } catch (e) {
      setError(e.friendly || "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profile-overlay" onClick={onClose}>
      <div className="profile-panel" onClick={(e) => e.stopPropagation()}>
        <button className="profile-close" onClick={onClose} aria-label="Close profile">
          ✕
        </button>

        <div className="profile-hero">
          <Avatar src={user.profilePictureUrl} name={user.displayName || user.username} size={84} />
          <p className="profile-name">{user.displayName || user.username}</p>
          <p className="profile-username">@{user.username}</p>
          <p className="profile-meta">
            {user.online ? (
              <>
                <span className="status-dot online" /> Online
              </>
            ) : (
              <>
                <span className="status-dot offline" /> {formatLastSeen(user.lastSeen)}
              </>
            )}
          </p>

          {isSelf && (
            <div className="profile-avatar-actions">
              <button className="link-btn strong" onClick={() => fileInputRef.current?.click()} disabled={saving}>
                Change photo
              </button>
              {user.profilePictureUrl && (
                <button className="link-btn" onClick={handleRemovePicture} disabled={saving}>
                  Remove
                </button>
              )}
            </div>
          )}
          {error && <p className="form-error">{error}</p>}
        </div>

        {isSelf && (
          <>
            <input ref={fileInputRef} type="file" accept="image/*" className="visually-hidden" onChange={handleFilePicked} />

            <div className="profile-section">
              <p className="profile-section-title">Settings</p>
              <div className="settings-list">
                <button
                  className="settings-item notif-setting"
                  onClick={handleNotificationToggle}
                  disabled={permission === "unsupported"}
                >
                  <span className="settings-icon">🔔</span>
                  <span className="notif-setting-text">
                    <span>Desktop notifications</span>
                    <span className="notif-setting-state">{permissionLabel(permission)}</span>
                  </span>
                </button>
              </div>
            </div>

            <button className="logout-btn" onClick={onLogout}>
              Log out
            </button>
          </>
        )}
      </div>

      {pendingFile && (
        <ModalShell title="Adjust your photo" onClose={() => setPendingFile(null)} width={340}>
          <AvatarCropper file={pendingFile} onCancel={() => setPendingFile(null)} onConfirm={handleCropConfirm} />
        </ModalShell>
      )}
    </div>
  );
}

function permissionLabel(permission) {
  if (permission === "granted") return "On";
  if (permission === "denied") return "Blocked in browser settings";
  if (permission === "unsupported") return "Not supported here";
  return "Tap to enable";
}

function formatLastSeen(lastSeen) {
  if (!lastSeen) return "Offline";
  const d = new Date(lastSeen);
  if (Number.isNaN(d.getTime())) return "Offline";
  return `last seen ${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}
