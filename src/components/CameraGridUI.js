import { useState, useEffect, useRef } from "react";

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600&display=swap');

  /* ── Reset ── */
  .m, .m * { box-sizing: border-box; margin: 0; padding: 0; }

  /*
   * VIDEO CRISPNESS RULES (apply everywhere):
   * - Never scale a video element with CSS transforms — use width/height directly
   * - object-fit: cover fills container without stretching pixels
   * - image-rendering: auto lets the GPU handle downscaling smoothly
   * - will-change: transform triggers GPU compositing layer → no tearing
   * - backface-visibility: hidden prevents subpixel bleed on some Android WebViews
   */
  .m video {
    display: block;
    width: 100%; height: 100%;
    object-fit: cover;
    object-position: center;
    image-rendering: auto;
    will-change: transform;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
  }

  /* ── Root ── */
  .m {
    --bg:      #0d0f14;
    --surf:    #151820;
    --surf2:   #1c202c;
    --surf3:   #232738;
    --bdr:     rgba(255,255,255,0.06);
    --bdr2:    rgba(255,255,255,0.13);
    --accent:  #6c8fff;
    --accent2: #a78bfa;
    --green:   #34d399;
    --red:     #f87171;
    --t1:      rgba(255,255,255,0.93);
    --t2:      rgba(255,255,255,0.50);
    --t3:      rgba(255,255,255,0.22);
    --sans:    'Plus Jakarta Sans', system-ui, sans-serif;

    font-family: var(--sans);
    background: var(--bg);
    color: var(--t1);
    /* Fill the full viewport, no scroll */
    width: 100%; height: 100dvh;
    max-height: 100dvh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    /* Prevent iOS rubber-band from exposing gaps */
    overscroll-behavior: none;
    -webkit-tap-highlight-color: transparent;
  }

  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.2} }

  /* ── TOP BAR ── */
  .m-top {
    flex-shrink: 0;
    height: 52px;
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 16px;
    background: var(--surf);
    border-bottom: 1px solid var(--bdr);
    z-index: 30;
  }
  .m-logo {
    display: flex; align-items: center; gap: 8px;
    font-size: 15px; font-weight: 700; letter-spacing: -0.3px; color: var(--t1);
  }
  .m-logo-icon {
    width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0;
    background: linear-gradient(135deg, var(--accent), var(--accent2));
    display: flex; align-items: center; justify-content: center;
  }
  .m-top-mid { display: flex; align-items: center; gap: 6px; min-width: 0; }
  .m-pill {
    display: flex; align-items: center; gap: 5px;
    padding: 4px 10px; border-radius: 20px;
    border: 1px solid var(--bdr2); background: var(--surf2);
    font-size: 11px; font-weight: 600; color: var(--t2);
    white-space: nowrap;
  }
  .m-pill.live { border-color: rgba(52,211,153,0.4); background: rgba(52,211,153,0.08); color: var(--green); }
  .m-pill-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; animation: blink 1.6s ease-in-out infinite; }
  .m-clock { font-size: 12px; font-weight: 500; color: var(--t2); white-space: nowrap; }

  /* Hide room pill text on very small screens, keep dot */
  @media (max-width: 360px) {
    .m-pill-text { display: none; }
    .m-logo span { display: none; }
  }

  /* ── JOIN BAR ── */
  .m-join {
    flex-shrink: 0;
    display: flex; align-items: center; gap: 8px;
    padding: 10px 16px;
    background: var(--surf);
    border-bottom: 1px solid var(--bdr);
    flex-wrap: wrap;
  }
  .m-field { position: relative; flex: 1; min-width: 130px; max-width: 240px; }
  .m-flabel {
    position: absolute; top: -7px; left: 10px;
    font-size: 9px; font-weight: 600; letter-spacing: 0.07em; text-transform: uppercase;
    color: var(--t3); background: var(--surf); padding: 0 3px;
  }
  .m-input {
    width: 100%;
    background: var(--surf2); border: 1px solid var(--bdr2); border-radius: 9px;
    padding: 8px 13px; font-family: var(--sans);
    /* 16px prevents iOS auto-zoom on focus */
    font-size: 16px; font-weight: 500; color: var(--t1); outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
    -webkit-appearance: none;
  }
  .m-input::placeholder { color: var(--t3); }
  .m-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(108,143,255,0.12); }

  .m-btn {
    display: flex; align-items: center; gap: 6px;
    padding: 8px 14px; border-radius: 9px;
    border: 1px solid var(--bdr2); background: var(--surf2);
    font-family: var(--sans); font-size: 13px; font-weight: 600; color: var(--t1);
    cursor: pointer; transition: all 0.14s; white-space: nowrap;
    -webkit-appearance: none; user-select: none;
  }
  .m-btn:active { opacity: 0.75; transform: scale(0.97); }
  .m-btn:disabled { opacity: 0.3; pointer-events: none; }
  @media (hover: hover) {
    .m-btn:hover:not(:disabled) { background: var(--surf3); border-color: rgba(255,255,255,0.2); }
  }
  .m-btn.cam  { background: rgba(108,143,255,0.1); border-color: rgba(108,143,255,0.35); color: var(--accent); }
  .m-btn.join { background: rgba(52,211,153,0.1);  border-color: rgba(52,211,153,0.35);  color: var(--green); }
  .m-btn.lv   { background: rgba(248,113,113,0.1); border-color: rgba(248,113,113,0.35); color: var(--red); }

  /* ── STAGE ── */
  .m-stage {
    flex: 1; min-height: 0;
    display: flex; flex-direction: column;
    gap: 8px;
    padding: 10px 10px 0;
    overflow: hidden;
  }

  /* ── SPOTLIGHT ── */
  .m-spot {
    flex: 1; min-height: 0; position: relative;
    border-radius: 14px; overflow: hidden;
    background: var(--surf); border: 1px solid var(--bdr);
    /* GPU layer so video composites cleanly */
    transform: translateZ(0);
    -webkit-transform: translateZ(0);
  }
  /* gradient overlays */
  .m-spot-grad {
    position: absolute; inset: 0; z-index: 2; pointer-events: none;
    background: linear-gradient(
      to top,
      rgba(0,0,0,0.58) 0%,
      rgba(0,0,0,0.0) 30%,
      rgba(0,0,0,0.0) 75%,
      rgba(0,0,0,0.22) 100%
    );
    border-radius: inherit;
  }
  .m-spot-name {
    position: absolute; bottom: 14px; left: 14px; z-index: 3;
    display: flex; align-items: center; gap: 7px;
    font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.9);
    text-shadow: 0 1px 4px rgba(0,0,0,0.5);
  }
  .m-ndot { width: 7px; height: 7px; border-radius: 50%; background: var(--green); animation: blink 1.6s ease-in-out infinite; }
  .m-badge {
    position: absolute; top: 12px; left: 12px; z-index: 3;
    font-size: 10px; font-weight: 600; letter-spacing: 0.05em;
    padding: 3px 9px; border-radius: 6px;
    background: rgba(108,143,255,0.18); border: 1px solid rgba(108,143,255,0.38); color: var(--accent);
  }
  .m-spot-empty {
    position: absolute; inset: 0;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 12px; padding: 20px; text-align: center;
  }
  .m-spot-empty p { font-size: 13px; font-weight: 500; color: var(--t3); line-height: 1.6; }

  /* ── PiP (your local camera) ── */
  .m-pip {
    position: absolute;
    /* responsive size via clamp: min 96px, ideal 18vw, max 200px */
    width: clamp(96px, 18vw, 200px);
    aspect-ratio: 16 / 9;
    bottom: 12px; right: 12px; z-index: 5;
    border-radius: 10px; overflow: hidden;
    border: 2px solid rgba(108,143,255,0.5);
    background: var(--surf2);
    /* GPU layer – prevents tearing on scroll/resize */
    transform: translateZ(0);
    -webkit-transform: translateZ(0);
    box-shadow: 0 6px 24px rgba(0,0,0,0.5);
    transition: box-shadow 0.2s;
    touch-action: none;
  }
  @media (hover: hover) {
    .m-pip:hover { box-shadow: 0 10px 32px rgba(0,0,0,0.65); }
  }
  .m-pip-lbl {
    position: absolute; bottom: 0; left: 0; right: 0; z-index: 2;
    padding: 4px 7px; font-size: 9px; font-weight: 600;
    color: rgba(255,255,255,0.8);
    background: linear-gradient(to top, rgba(0,0,0,0.65), transparent);
  }
  .m-pip-off {
    position: absolute; inset: 0;
    display: flex; align-items: center; justify-content: center;
    background: var(--surf2); color: var(--t3);
  }

  /* ── THUMBNAIL STRIP ── */
  .m-strip {
    flex-shrink: 0;
    display: flex; gap: 8px;
    padding-bottom: 10px;
    overflow-x: auto;
    overflow-y: hidden;
    -webkit-overflow-scrolling: touch;
    scroll-snap-type: x mandatory;
    scrollbar-width: none;
  }
  .m-strip::-webkit-scrollbar { display: none; }

  .m-thumb {
    flex-shrink: 0;
    /* responsive thumb width */
    width: clamp(110px, 22vw, 170px);
    aspect-ratio: 16 / 9;
    border-radius: 10px; overflow: hidden;
    border: 2px solid transparent;
    background: var(--surf2); position: relative;
    cursor: pointer;
    scroll-snap-align: start;
    transition: border-color 0.15s;
    /* GPU layer */
    transform: translateZ(0);
    -webkit-transform: translateZ(0);
  }
  .m-thumb:active { opacity: 0.8; }
  .m-thumb.sel { border-color: var(--accent); }
  @media (hover: hover) {
    .m-thumb:hover { border-color: var(--bdr2); }
  }
  .m-thumb-meta {
    position: absolute; bottom: 0; left: 0; right: 0; z-index: 2;
    padding: 4px 7px; font-size: 9px; font-weight: 600;
    color: rgba(255,255,255,0.8);
    background: linear-gradient(to top, rgba(0,0,0,0.65), transparent);
    display: flex; align-items: center; justify-content: space-between;
  }
  .m-rdot { width: 5px; height: 5px; border-radius: 50%; background: var(--red); animation: blink 1.6s ease-in-out infinite; }

  /* ── BOTTOM BAR ── */
  .m-bar {
    flex-shrink: 0;
    /* safe-area-inset for iPhone home bar */
    padding: 0 16px calc(env(safe-area-inset-bottom, 0px) + 4px);
    height: calc(60px + env(safe-area-inset-bottom, 0px));
    display: flex; align-items: center; justify-content: center; gap: 6px;
    background: var(--surf);
    border-top: 1px solid var(--bdr);
  }
  .m-ctrl {
    /* tap-target min 44x44 per HIG */
    min-width: 44px; height: 44px; padding: 0 10px;
    border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    border: 1px solid var(--bdr2); background: var(--surf2);
    cursor: pointer; color: var(--t2);
    transition: background 0.14s, color 0.14s;
    user-select: none; -webkit-tap-highlight-color: transparent;
  }
  .m-ctrl:active { opacity: 0.7; transform: scale(0.95); }
  @media (hover: hover) {
    .m-ctrl:hover { background: var(--surf3); color: var(--t1); }
  }
  .m-ctrl svg { width: 18px; height: 18px; flex-shrink: 0; }
  .m-ctrl.off { background: rgba(248,113,113,0.1); border-color: rgba(248,113,113,0.3); color: var(--red); }
  .m-ctrl.end { background: rgba(248,113,113,0.1); border-color: rgba(248,113,113,0.35); color: var(--red); }
  .m-sep { width: 1px; height: 24px; background: var(--bdr); flex-shrink: 0; margin: 0 2px; }
  .m-pcount { font-size: 11px; font-weight: 600; color: var(--t3); margin-left: 4px; white-space: nowrap; }

  /* Hide non-essential bar items on narrow phones */
  @media (max-width: 400px) {
    .m-ctrl.hide-xs { display: none; }
    .m-sep.hide-xs  { display: none; }
    .m-pcount       { display: none; }
  }

  /* ── TABLET / LANDSCAPE PHONE ──
     On wider screens show strip on the right side instead of bottom */
  @media (min-width: 768px) and (orientation: landscape),
         (min-width: 900px) {
    .m-stage {
      flex-direction: row;
      padding: 12px 12px 0;
    }
    .m-strip {
      flex-direction: column;
      overflow-x: hidden;
      overflow-y: auto;
      padding-bottom: 12px;
      padding-right: 0;
      scroll-snap-type: y mandatory;
      width: clamp(120px, 18vw, 180px);
      flex-shrink: 0;
      gap: 8px;
    }
    .m-thumb {
      width: 100%;
      scroll-snap-align: start;
    }
  }

  /* ── LAPTOP / DESKTOP ── */
  @media (min-width: 1024px) {
    .m-top { height: 56px; padding: 0 24px; }
    .m-join { padding: 12px 24px; }
    .m-stage { padding: 14px 14px 0; gap: 10px; }
    .m-bar { height: calc(64px + env(safe-area-inset-bottom, 0px)); gap: 8px; }
    .m-ctrl { min-width: 44px; height: 44px; }
    .m-pip { width: clamp(140px, 14vw, 210px); bottom: 16px; right: 16px; }
  }
`;

/* ── Spotlight video ── */
function SpotlightVideo({ stream, peerId }) {
  const ref = (el) => { if (el && stream) el.srcObject = stream; };
  return (
    <>
      <video ref={ref} autoPlay playsInline />
      <div className="m-spot-grad" />
      <div className="m-badge">Presenter</div>
      <div className="m-spot-name">
        <span className="m-ndot" />
        Peer {peerId.slice(0, 8)}
      </div>
    </>
  );
}

/* ── Thumbnail card ── */
function ThumbCard({ stream, peerId, isActive, onClick }) {
  const ref = (el) => { if (el && stream) el.srcObject = stream; };
  return (
    <div className={`m-thumb${isActive ? " sel" : ""}`} onClick={onClick}>
      <video ref={ref} autoPlay playsInline />
      <div className="m-thumb-meta">
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "80%" }}>
          {peerId.slice(0, 8)}
        </span>
        <span className="m-rdot" />
      </div>
    </div>
  );
}

/* ── Clock ── */
function Clock() {
  const fmt = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const [t, setT] = useState(fmt);
  useEffect(() => {
    const id = setInterval(() => setT(fmt()), 15000);
    return () => clearInterval(id);
  }, []);
  return <span className="m-clock">{t}</span>;
}

/* ── Icons ── */
const Icon = {
  cam: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/>
    </svg>
  ),
  camOff: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="2" y1="2" x2="22" y2="22"/>
      <path d="M10.66 6H14a2 2 0 012 2v2.34l1 1L21 8.723v6.554l-7.24-7.24M3 8a2 2 0 00-.48.06L3 8zM3.27 3.27L3 3.5v13a2 2 0 002 2h13.5"/>
    </svg>
  ),
  mic: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
      <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"/>
    </svg>
  ),
  micOff: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="2" y1="2" x2="22" y2="22"/>
      <path d="M18.89 13.23A7.12 7.12 0 0019 12v-2M5 10v2a7 7 0 0012 0M15 9.34V4a3 3 0 00-5.68-1.33M12 19v4M8 23h8"/>
    </svg>
  ),
  screen: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
    </svg>
  ),
  chat: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
    </svg>
  ),
  people: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
    </svg>
  ),
  end: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  vidStart: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/>
    </svg>
  ),
  join: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3"/>
    </svg>
  ),
  leave: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
    </svg>
  ),
};

/* ── Main export ── */
export default function CameraGridUI({
  localVideoRef,
  remoteStreams = [],
  userId,
  room,
  setRoom,
  joined,
  cameraStarted,
  startCamera,
  joinRoom,
  leaveRoom,
  camOn = true,
  micOn = true,
  toggleCam,
  toggleMic,
}) {
  const [pinnedId, setPinnedId] = useState(null);

  // Auto-pin first peer, clear pin when they leave
  useEffect(() => {
    if (remoteStreams.length === 0) setPinnedId(null);
  }, [remoteStreams.length]);

  const spotlight = remoteStreams.length > 0
    ? (remoteStreams.find(s => s.id === pinnedId) || remoteStreams[0])
    : null;

  const showStrip = remoteStreams.length >= 2;
  const totalPeers = remoteStreams.length + 1;

  return (
    <>
      <style>{css}</style>
      <div className="m">

        {/* ── Top bar ── */}
        <div className="m-top">
          <div className="m-logo">
            <div className="m-logo-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <path d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/>
              </svg>
            </div>
            <span>Camgrid</span>
          </div>

          <div className="m-top-mid">
            {joined && (
              <div className="m-pill live">
                <span className="m-pill-dot" />
                <span className="m-pill-text">{room}</span>
              </div>
            )}
            <div className="m-pill">
              {totalPeers} <span className="m-pill-text">&nbsp;participant{totalPeers !== 1 ? "s" : ""}</span>
            </div>
          </div>

          <Clock />
        </div>

        {/* ── Join bar ── */}
        <div className="m-join">
          <button className="m-btn cam" onClick={startCamera} disabled={cameraStarted}>
            {Icon.vidStart}
            {cameraStarted ? "Cam on" : "Start cam"}
          </button>

          <div className="m-field">
            <span className="m-flabel">Room</span>
            <input
              className="m-input"
              value={room}
              onChange={e => setRoom(e.target.value)}
              placeholder="room-name"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
            />
          </div>

          {!joined ? (
            <button className="m-btn join" onClick={joinRoom} disabled={!cameraStarted}>
              {Icon.join} Join
            </button>
          ) : (
            <button className="m-btn lv" onClick={leaveRoom}>
              {Icon.leave} Leave
            </button>
          )}

          {userId && (
            <span style={{ fontSize: 10, color: "var(--t3)", fontWeight: 500, marginLeft: "auto", whiteSpace: "nowrap" }}>
              {userId.slice(0, 8)}…
            </span>
          )}
        </div>

        {/* ── Stage ── */}
        <div className="m-stage">

          {/* Spotlight */}
          <div className="m-spot">
            {spotlight ? (
              <SpotlightVideo stream={spotlight.stream} peerId={spotlight.id} />
            ) : (
              <div className="m-spot-empty">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.2">
                  <path d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/>
                </svg>
                <p>{joined ? "Waiting for others to join…" : "Join a room to start your meeting"}</p>
              </div>
            )}

            {/* PiP — your local feed */}
            <div className="m-pip">
              {cameraStarted && (
                <video
                  ref={localVideoRef}
                  autoPlay playsInline muted
                  style={{ display: camOn ? "block" : "none" }}
                />
              )}
              {(!cameraStarted || !camOn) && (
                <div className="m-pip-off">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.3">
                    <line x1="2" y1="2" x2="22" y2="22"/>
                    <path d="M10.66 6H14a2 2 0 012 2v2.34l1 1L21 8.723v6.554l-7.24-7.24M3 8a2 2 0 00-.48.06L3 8zM3.27 3.27L3 3.5v13a2 2 0 002 2h13.5"/>
                  </svg>
                </div>
              )}
              <div className="m-pip-lbl">
                {!cameraStarted ? "No cam" : camOn ? "You" : "Cam off"}
              </div>
            </div>
          </div>

          {/* Thumbnail strip */}
          {showStrip && (
            <div className="m-strip">
              {remoteStreams.map(s => (
                <ThumbCard
                  key={s.id}
                  stream={s.stream}
                  peerId={s.id}
                  isActive={s.id === spotlight?.id}
                  onClick={() => setPinnedId(s.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Bottom bar ── */}
        <div className="m-bar">
          <div className={`m-ctrl${!micOn ? " off" : ""}`} onClick={toggleMic} title={micOn ? "Mute" : "Unmute"}>
            {micOn ? Icon.mic : Icon.micOff}
          </div>
          <div className={`m-ctrl${!camOn ? " off" : ""}`} onClick={toggleCam} title={camOn ? "Stop video" : "Start video"}>
            {camOn ? Icon.cam : Icon.camOff}
          </div>
          <div className="m-ctrl hide-xs" title="Share screen">
            {Icon.screen}
          </div>

          <div className="m-sep hide-xs" />

          <div className="m-ctrl hide-xs" title="Chat">
            {Icon.chat}
          </div>
          <div className="m-ctrl hide-xs" title="Participants">
            {Icon.people}
          </div>

          <div className="m-sep" />

          {joined && (
            <div className="m-ctrl end" onClick={leaveRoom} title="Leave call">
              {Icon.end}
            </div>
          )}

          {remoteStreams.length > 0 && (
            <span className="m-pcount">{remoteStreams.length} peer{remoteStreams.length > 1 ? "s" : ""}</span>
          )}
        </div>

      </div>
    </>
  );
}
