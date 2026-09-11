// Login / signup — Herd's front door, so it carries the brand: animated
// gradient field behind a mouse-tracked 3D tilt card (perspective +
// preserve-3d, layers lifted on translateZ). Tilt math mutates the DOM node
// directly (no React re-render per mousemove). All motion is gated behind
// prefers-reduced-motion.
import React, { useRef, useState } from "react";
import { login, signup } from "../auth";

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

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
    position: relative; overflow: hidden;
    perspective: 1200px;
  }

  /* ── Animated gradient field ── */
  .a-orb {
    position: absolute; border-radius: 50%;
    filter: blur(90px); opacity: 0.55; pointer-events: none;
    will-change: transform;
  }
  .a-orb.o1 { width: 480px; height: 480px; background: radial-gradient(circle, #6c8fff 0%, transparent 70%); top: -140px; left: -100px; }
  .a-orb.o2 { width: 420px; height: 420px; background: radial-gradient(circle, #a78bfa 0%, transparent 70%); bottom: -120px; right: -80px; }
  .a-orb.o3 { width: 300px; height: 300px; background: radial-gradient(circle, #34d399 0%, transparent 70%); top: 55%; left: 12%; opacity: 0.22; }

  @media (prefers-reduced-motion: no-preference) {
    @keyframes drift1 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(70px, 50px) scale(1.15); } }
    @keyframes drift2 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-60px, -40px) scale(0.9); } }
    @keyframes drift3 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(40px, -60px) scale(1.2); } }
    .a-orb.o1 { animation: drift1 16s ease-in-out infinite; }
    .a-orb.o2 { animation: drift2 20s ease-in-out infinite; }
    .a-orb.o3 { animation: drift3 24s ease-in-out infinite; }

    @keyframes cardIn {
      from { opacity: 0; transform: translateY(28px) rotateX(8deg); }
      to   { opacity: 1; transform: translateY(0) rotateX(0deg); }
    }
    .a-card { animation: cardIn 0.7s cubic-bezier(0.22, 1, 0.36, 1); }
  }

  /* Subtle dot grid to give the tilt something to read against */
  .a-grid {
    position: absolute; inset: 0; pointer-events: none; opacity: 0.35;
    background-image: radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px);
    background-size: 28px 28px;
    mask-image: radial-gradient(ellipse 70% 60% at 50% 45%, black 30%, transparent 75%);
    -webkit-mask-image: radial-gradient(ellipse 70% 60% at 50% 45%, black 30%, transparent 75%);
  }

  /* ── 3D tilt card ── */
  .a-card {
    width: 100%; max-width: 380px;
    background: rgba(21, 24, 32, 0.72);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    border: 1px solid var(--bdr2); border-radius: 20px;
    padding: 36px 30px;
    position: relative;
    transform-style: preserve-3d;
    transition: transform 0.18s ease-out, box-shadow 0.3s;
    box-shadow: 0 24px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06);
    will-change: transform;
  }
  /* sheen that slides with the tilt */
  .a-card::before {
    content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
    background: linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.045) 48%, transparent 62%);
  }

  .a-depth-1 { transform: translateZ(42px); transform-style: preserve-3d; }
  .a-depth-2 { transform: translateZ(24px); }

  .a-logo { display: flex; align-items: center; gap: 11px; margin-bottom: 8px; }
  .a-logo-icon {
    width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0;
    background: linear-gradient(135deg, var(--accent), var(--accent2));
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 8px 24px rgba(108,143,255,0.35);
  }
  .a-title {
    font-size: 26px; font-weight: 800; letter-spacing: -0.8px;
    background: linear-gradient(100deg, #fff 20%, #b9c8ff 60%, #d3c5ff 90%);
    -webkit-background-clip: text; background-clip: text;
    -webkit-text-fill-color: transparent; color: transparent;
  }
  .a-sub { font-size: 13px; color: var(--t2); margin-bottom: 26px; line-height: 1.55; }

  .a-form { display: flex; flex-direction: column; gap: 12px; }
  .a-label { font-size: 10px; font-weight: 600; letter-spacing: 0.07em; text-transform: uppercase; color: var(--t3); margin-bottom: -6px; }
  .a-input {
    width: 100%; background: var(--surf2); border: 1px solid var(--bdr2); border-radius: 10px;
    padding: 11px 14px; font-family: inherit; font-size: 16px; font-weight: 500;
    color: var(--t1); outline: none; transition: border-color 0.15s, box-shadow 0.15s;
    -webkit-appearance: none;
  }
  .a-input::placeholder { color: var(--t3); }
  .a-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(108,143,255,0.12); }
  .a-btn {
    margin-top: 8px; padding: 12px; border-radius: 10px; border: none;
    background: linear-gradient(135deg, var(--accent), var(--accent2));
    font-family: inherit; font-size: 14px; font-weight: 700; color: #fff;
    cursor: pointer; transition: opacity 0.15s, transform 0.15s, box-shadow 0.2s;
    box-shadow: 0 6px 20px rgba(108,143,255,0.28);
  }
  .a-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 10px 28px rgba(108,143,255,0.4); }
  .a-btn:active:not(:disabled) { transform: translateY(0) scale(0.98); }
  .a-btn:disabled { opacity: 0.45; cursor: default; }
  .a-err { font-size: 12.5px; color: var(--red); line-height: 1.4; }
  .a-switch { margin-top: 20px; font-size: 12.5px; color: var(--t2); text-align: center; }
  .a-switch button {
    background: none; border: none; font-family: inherit; font-size: 12.5px;
    font-weight: 600; color: var(--accent); cursor: pointer; padding: 0 0 0 5px;
  }
`;

// Max tilt in degrees; kept small so the form stays comfortably readable.
const TILT = 7;

export default function AuthPage({ onAuth }) {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const cardRef = useRef(null);
  const reducedMotion = typeof window !== "undefined" &&
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const isSignup = mode === "signup";

  const handleTilt = (e) => {
    const card = cardRef.current;
    if (!card || reducedMotion) return;
    const rect = card.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;  // -0.5 … 0.5
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    card.style.transform = `rotateY(${px * TILT * 2}deg) rotateX(${-py * TILT * 2}deg)`;
  };

  const resetTilt = () => {
    const card = cardRef.current;
    if (card) card.style.transform = "";
  };

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
      <div className="a" onMouseMove={handleTilt} onMouseLeave={resetTilt}>
        <div className="a-orb o1" />
        <div className="a-orb o2" />
        <div className="a-orb o3" />
        <div className="a-grid" />

        <div className="a-card" ref={cardRef}>
          <div className="a-depth-1">
            <div className="a-logo">
              <div className="a-logo-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <circle cx="8" cy="9" r="3.1" />
                  <circle cx="16" cy="9" r="3.1" />
                  <circle cx="12" cy="15.6" r="3.5" />
                </svg>
              </div>
              <span className="a-title">Herd</span>
            </div>
            <p className="a-sub">
              {isSignup
                ? "Create an account — hang out on camera with your people, and go live together when it gets good."
                : "Welcome back. Your herd awaits."}
            </p>
          </div>

          <div className="a-depth-2">
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
      </div>
    </>
  );
}
