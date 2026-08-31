import React, { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import Logo from "../components/Logo.jsx";
import "./AuthPage.css";

export default function AuthPage() {
  const [mode, setMode] = useState("login"); // "login" | "signup"

  return (
    <div className="auth-screen">
      <GlowField />
      <BubbleField />

      <div className="auth-content">
        <div className="wordmark-block">
          <div className="wordmark-row">
            <Logo size={52} />
            <h1 className="wordmark gradient-text">Yapp</h1>
          </div>
          <p className="tagline">Talk. Connect. Yapp.</p>
        </div>

        {mode === "login" ? <LoginCard onSwitch={() => setMode("signup")} /> : <SignupCard onSwitch={() => setMode("login")} />}
      </div>
    </div>
  );
}

function GlowField() {
  return (
    <div className="glow-field" aria-hidden="true">
      <span className="glow glow-a" />
      <span className="glow glow-b" />
    </div>
  );
}

function BubbleField() {
  return (
    <div className="bubble-field" aria-hidden="true">
      <span className="bubble b1" />
      <span className="bubble b2" />
      <span className="bubble b3" />
      <span className="bubble b4" />
    </div>
  );
}

function LoginCard({ onSwitch }) {
  const { login, status, error } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    if (!username.trim() || !password) {
      setLocalError("Please fill in all required fields.");
      return;
    }
    await login({ username: username.trim(), password });
  };

  return (
    <form className="auth-card" onSubmit={handleSubmit}>
      <label className="field">
        <span>Username</span>
        <input
          type="text"
          placeholder="yourname"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
      </label>

      <label className="field">
        <span>Password</span>
        <input
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </label>

      {(localError || error) && <p className="form-error">{localError || error}</p>}

      <button type="submit" className="cta-primary" disabled={status === "loading"}>
        {status === "loading" ? "Signing you in…" : "Continue to Yapp"}
      </button>

      <p className="switch-line">
        First time here?{" "}
        <button type="button" className="link-btn strong" onClick={onSwitch}>
          Create account
        </button>
      </p>
    </form>
  );
}

function SignupCard({ onSwitch }) {
  const { register, status, error } = useAuth();
  const [form, setForm] = useState({ username: "", password: "", confirm: "" });
  const [localError, setLocalError] = useState(null);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const passwordsMismatch = form.confirm.length > 0 && form.password !== form.confirm;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);

    if (!form.username.trim() || !form.password || !form.confirm) {
      setLocalError("Please fill in all required fields.");
      return;
    }
    if (form.password !== form.confirm) {
      setLocalError("Passwords do not match.");
      return;
    }

    // Re-enter-password is frontend-only validation — never sent to the backend.
    await register({ username: form.username.trim(), password: form.password });
  };

  return (
    <form className="auth-card" onSubmit={handleSubmit}>
      <label className="field">
        <span>Username</span>
        <input type="text" placeholder="yourname" autoComplete="username" value={form.username} onChange={update("username")} required />
      </label>

      <div className="field-pair">
        <label className="field">
          <span>Password</span>
          <input type="password" placeholder="••••••••" autoComplete="new-password" value={form.password} onChange={update("password")} required />
        </label>
        <label className="field">
          <span>Re-enter password</span>
          <input type="password" placeholder="••••••••" autoComplete="new-password" value={form.confirm} onChange={update("confirm")} required />
        </label>
      </div>

      {passwordsMismatch && <p className="form-error">Passwords don't match yet</p>}
      {(localError || error) && <p className="form-error">{localError || error}</p>}

      <button type="submit" className="cta-primary" disabled={status === "loading"}>
        {status === "loading" ? "Setting things up…" : "Join Yapp"}
      </button>

      <p className="switch-line">
        Already have an account?{" "}
        <button type="button" className="link-btn strong" onClick={onSwitch}>
          Log in
        </button>
      </p>
    </form>
  );
}
