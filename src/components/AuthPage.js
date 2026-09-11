// Login / signup page — replaces the old AccessPage (a client-side access
// code shipped in the bundle, i.e. not real auth). Talks to the backend's
// /auth endpoints; on success hands the session {token, username} up to App.
import React, { useState } from "react";
import { login, signup } from "../auth";

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

  .a, .a * { box-sizing: border-box; margin: 0; padding: 0; }
  .a {
    --bg: #0d0f14; --surf: #151820; --surf2: #1c202c;
    --bdr: rgba(255,255,255,0.06); --bdr2: rgba(255,255,255,0.13);
    --accent: #6c8fff; --accent2: #a78bfa; --red: #f87171;
    --t1: rgba(255,255,255,0.93); --t2: rgba(255,255,255,0.50); --t3: rgba(255,255,255,0.22);
    font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
    background: var(--bg); color: var(--t1);
    width: 100%; min-height: 100dvh;
    display: flex; align-items: center; justify-content: center;
    padding: 24px;
  }
  .a-card {
    width: 100%; max-width: 360px;
    background: var(--surf); border: 1px solid var(--bdr); border-radius: 16px;
    padding: 32px 28px;
  }
  .a-logo { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
  .a-logo-icon {
    width: 34px; height: 34px; border-radius: 10px;
    background: linear-gradient(135deg, var(--accent), var(--accent2));
    display: flex; align-items: center; justify-content: center;
  }
  .a-title { font-size: 18px; font-weight: 700; letter-spacing: -0.3px; }
  .a-sub { font-size: 12.5px; color: var(--t2); margin-bottom: 24px; line-height: 1.5; }
  .a-form { display: flex; flex-direction: column; gap: 12px; }
  .a-label { font-size: 10px; font-weight: 600; letter-spacing: 0.07em; text-transform: uppercase; color: var(--t3); margin-bottom: -6px; }
  .a-input {
    width: 100%; background: var(--surf2); border: 1px solid var(--bdr2); border-radius: 9px;
    padding: 10px 13px; font-family: inherit; font-size: 16px; font-weight: 500;
    color: var(--t1); outline: none; transition: border-color 0.15s, box-shadow 0.15s;
    -webkit-appearance: none;
  }
  .a-input::placeholder { color: var(--t3); }
  .a-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(108,143,255,0.12); }
  .a-btn {
    margin-top: 6px; padding: 11px; border-radius: 9px; border: none;
    background: linear-gradient(135deg, var(--accent), var(--accent2));
    font-family: inherit; font-size: 14px; font-weight: 600; color: #fff;
    cursor: pointer; transition: opacity 0.15s;
  }
  .a-btn:disabled { opacity: 0.45; cursor: default; }
  .a-err { font-size: 12.5px; color: var(--red); line-height: 1.4; }
  .a-switch { margin-top: 18px; font-size: 12.5px; color: var(--t2); text-align: center; }
  .a-switch button {
    background: none; border: none; font-family: inherit; font-size: 12.5px;
    font-weight: 600; color: var(--accent); cursor: pointer; padding: 0 0 0 5px;
  }
`;

export default function AuthPage({ onAuth }) {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const isSignup = mode === "signup";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const session = isSignup ? await signup(username.trim(), password) : await login(username.trim(), password);
      onAuth(session);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <style>{css}</style>
      <div className="a">
        <div className="a-card">
          <div className="a-logo">
            <div className="a-logo-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <path d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
              </svg>
            </div>
            <span className="a-title">Camgrid</span>
          </div>
          <p className="a-sub">
            {isSignup ? "Create an account to start calling and broadcasting." : "Welcome back — sign in to join a room."}
          </p>

          <form className="a-form" onSubmit={handleSubmit}>
            <span className="a-label">Username</span>
            <input
              className="a-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="your-name"
              autoComplete="username"
              autoCorrect="off"
              autoCapitalize="off"
            />
            <span className="a-label">Password</span>
            <input
              className="a-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isSignup ? "at least 8 characters" : "password"}
              autoComplete={isSignup ? "new-password" : "current-password"}
            />
            {error && <p className="a-err">{error}</p>}
            <button className="a-btn" type="submit" disabled={busy || !username.trim() || !password}>
              {busy ? "…" : isSignup ? "Create account" : "Sign in"}
            </button>
          </form>

          <div className="a-switch">
            {isSignup ? "Already have an account?" : "New here?"}
            <button type="button" onClick={() => { setMode(isSignup ? "login" : "signup"); setError(""); }}>
              {isSignup ? "Sign in" : "Create account"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
