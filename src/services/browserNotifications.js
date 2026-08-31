// ============================================================
// Yapp — browser/system notifications + notification sound
// ============================================================

import notificationSound from "../assets/notification.mp3";

let audio = null;

function getAudio() {
  if (!audio) {
    audio = new Audio(notificationSound);
    audio.volume = 0.6;
    audio.preload = "auto";
  }

  return audio;
}

export function isSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

// "granted" | "denied" | "default" | "unsupported"
export function getPermissionState() {
  if (!isSupported()) return "unsupported";
  return Notification.permission;
}

export async function ensurePermission() {
  if (!isSupported()) return "unsupported";

  if (
      Notification.permission === "granted" ||
      Notification.permission === "denied"
  ) {
    return Notification.permission;
  }

  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

// Call this after the user has interacted with the app.
// It allows the browser to unlock audio playback.
export function unlockSound() {
  try {
    const sound = getAudio();

    sound.muted = true;

    const promise = sound.play();

    if (promise) {
      promise
          .then(() => {
            sound.pause();
            sound.currentTime = 0;
            sound.muted = false;
          })
          .catch(() => {
            sound.muted = false;
          });
    }
  } catch {
    // Ignore browsers that block audio.
  }
}

export function playNotificationSound() {
  try {
    const sound = getAudio();

    sound.currentTime = 0;
    sound.muted = false;

    const promise = sound.play();

    if (promise) {
      promise.catch(() => {
        // Browser blocked autoplay. Nothing else to do.
      });
    }
  } catch {
    // Ignore audio errors so notifications still work.
  }
}

export function notify({ title, body, icon, onClick }) {
  if (!isSupported() || Notification.permission !== "granted") {
    return null;
  }

  // Play Yapp's own notification sound.
  playNotificationSound();

  const n = new Notification(title, {
    body,
    icon,
    silent: true,
  });

  if (onClick) {
    n.onclick = () => {
      window.focus();
      onClick();
      n.close();
    };
  }

  return n;
}