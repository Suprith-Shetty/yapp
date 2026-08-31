import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import * as api from "../services/api.js";
import { connectSocket, disconnectSocket } from "../services/socket.js";
import { decodeJwt } from "../utils/jwt.js";

const AuthContext = createContext(null);

const TOKEN_KEY = "yapp_token";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | loading | error
  const [error, setError] = useState(null);
  // true right after registration, until the person finishes (or
  // skips) the post-registration avatar setup screen
  const [needsProfileSetup, setNeedsProfileSetup] = useState(false);
  // distinguishes "haven't checked localStorage yet" from "checked, no
  // session" — the app shell uses this to avoid flashing the login
  // screen before a saved session is restored
  const [restoring, setRestoring] = useState(true);

  const hydrateFromToken = useCallback(async (token) => {
    const claims = decodeJwt(token);
    if (!claims?.sub) throw new Error("Malformed token");
    const profile = await api.getProfile(claims.sub);
    const hydrated = {
      id: profile.id,
      username: profile.userName,
      displayName: profile.displayName,
      profilePictureUrl: profile.profilePictureUrl,
      online: profile.online,
      lastSeen: profile.lastSeen,
    };
    setUser(hydrated);
    connectSocket(token);
    return hydrated;
  }, []);

  // Preserve authentication state across a page refresh.
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setRestoring(false);
      return;
    }
    hydrateFromToken(token)
      .catch(() => {
        // token expired/invalid — drop it and fall back to the login screen
        localStorage.removeItem(TOKEN_KEY);
      })
      .finally(() => setRestoring(false));
  }, [hydrateFromToken]);

  const login = useCallback(
    async ({ username, password }) => {
      setStatus("loading");
      setError(null);
      try {
        const { token } = await api.login({ username, password });
        localStorage.setItem(TOKEN_KEY, token);
        await hydrateFromToken(token);
        setStatus("idle");
        return true;
      } catch (e) {
        setError(e.friendly || e.message);
        setStatus("error");
        return false;
      }
    },
    [hydrateFromToken]
  );

  // Registration only returns { userName, message } — no token. So we
  // chain an immediate login with the same credentials to obtain one,
  // then flag that the profile-setup screen should show before chat.
  const register = useCallback(
    async ({ username, password }) => {
      setStatus("loading");
      setError(null);
      try {
        await api.register({ username, password });
        const { token } = await api.login({ username, password });
        localStorage.setItem(TOKEN_KEY, token);
        await hydrateFromToken(token);
        setNeedsProfileSetup(true);
        setStatus("idle");
        return true;
      } catch (e) {
        setError(e.friendly || e.message);
        setStatus("error");
        return false;
      }
    },
    [hydrateFromToken]
  );

  const finishProfileSetup = useCallback(async () => {
    // pull the freshest profile in case an avatar was just uploaded
    if (user?.id) {
      try {
        const profile = await api.getProfile(user.id);
        setUser((u) => ({ ...u, profilePictureUrl: profile.profilePictureUrl, displayName: profile.displayName }));
      } catch {
        // non-fatal — proceed into the app with whatever we already have
      }
    }
    setNeedsProfileSetup(false);
  }, [user?.id]);

  const refreshProfile = useCallback(async () => {
    if (!user?.id) return;
    const profile = await api.getProfile(user.id);
    setUser((u) => ({ ...u, profilePictureUrl: profile.profilePictureUrl, displayName: profile.displayName }));
  }, [user?.id]);

  const logout = useCallback(() => {
    disconnectSocket();
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setNeedsProfileSetup(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        status,
        error,
        restoring,
        needsProfileSetup,
        login,
        register,
        logout,
        finishProfileSetup,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
