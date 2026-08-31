import React, { useState, useRef } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import * as api from "../services/api.js";
import Avatar from "../components/Avatar.jsx";
import ModalShell from "../components/ModalShell.jsx";
import AvatarCropper from "../components/AvatarCropper.jsx";
import { DEFAULT_AVATARS, renderDefaultAvatarDataUrl, defaultAvatarToFile } from "../utils/defaultAvatars.js";
import "./ProfileSetup.css";

export default function ProfileSetup() {
  const { user, finishProfileSetup } = useAuth();
  const [previewUrl, setPreviewUrl] = useState(null); // local preview, not yet saved
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [pendingFile, setPendingFile] = useState(null); // File awaiting the crop step
  const fileInputRef = useRef(null);

  const handleFilePicked = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Image is too large. Please choose a file under 10MB.");
      return;
    }
    setError(null);
    setPendingFile(file);
  };

  const handlePickDefault = (id) => {
    setError(null);
    setPreviewUrl({ kind: "default", id, dataUrl: renderDefaultAvatarDataUrl(id) });
  };

  const handleCropConfirm = (croppedFile) => {
    setPendingFile(null);
    setPreviewUrl({ kind: "custom", file: croppedFile, dataUrl: URL.createObjectURL(croppedFile) });
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      if (previewUrl) {
        const file = previewUrl.kind === "custom" ? previewUrl.file : await defaultAvatarToFile(previewUrl.id);
        await api.uploadProfilePicture(file);
      }
      await finishProfileSetup();
    } catch (e) {
      setError(e.friendly || "We couldn't save your profile picture. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const skip = async () => {
    // No picture chosen — the fallback initial-letter avatar (handled
    // entirely on the frontend) takes over everywhere in the app.
    await finishProfileSetup();
  };

  return (
    <div className="profile-setup-screen">
      <div className="profile-setup-card">
        <h1>Add a profile picture</h1>
        <p className="profile-setup-sub">Pick one of ours, upload your own, or skip — you can always change this later.</p>

        <div className="profile-setup-preview">
          <Avatar
            src={previewUrl?.dataUrl}
            name={user?.username}
            size={112}
          />
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="default-avatar-grid">
          {DEFAULT_AVATARS.map((a) => (
            <button
              key={a.id}
              type="button"
              className={`default-avatar-option ${previewUrl?.kind === "default" && previewUrl.id === a.id ? "selected" : ""}`}
              style={{ background: a.bg }}
              onClick={() => handlePickDefault(a.id)}
              aria-label={a.label}
              title={a.label}
            >
              <img src={renderDefaultAvatarDataUrl(a.id)} alt="" />
            </button>
          ))}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="visually-hidden"
          onChange={handleFilePicked}
        />

        <button type="button" className="cta-secondary" onClick={() => fileInputRef.current?.click()}>
          Upload a photo
        </button>

        <div className="profile-setup-actions">
          <button type="button" className="link-btn" onClick={skip} disabled={saving}>
            Skip for now
          </button>
          <button type="button" className="cta-primary" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Continue to Yapp"}
          </button>
        </div>
      </div>

      {pendingFile && (
        <ModalShell title="Adjust your photo" onClose={() => setPendingFile(null)} width={340}>
          <AvatarCropper file={pendingFile} onCancel={() => setPendingFile(null)} onConfirm={handleCropConfirm} />
        </ModalShell>
      )}
    </div>
  );
}
