import React, { useRef, useState, useEffect, useCallback } from "react";
import { io } from "socket.io-client";
import CameraGridUI from "./CameraGridUI";
import Broadcaster from "../lib/broadcaster";
import { SERVER_URL, createRoom } from "../auth";

// Drover (ABR broadcast server) base URL, e.g. http://localhost:8000.
// Go Live is hidden entirely when unset. ws(s):// for ingest and http(s)://
// for the watch page are both derived from this one value.
const DROVER_URL = (process.env.REACT_APP_DROVER_URL || "").replace(/\/$/, "");
const DROVER_WS = DROVER_URL.replace(/^http/, "ws");

// Stream keys must satisfy drover's STREAM_KEY_RE ([a-zA-Z0-9_-]{1,64}) —
// derived from the room name so every room maps to a stable broadcast URL.
const streamKeyForRoom = (room) => room.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 64);

// A direct peer-to-peer path only works when at least one side is reachable.
// Between two devices on the same LAN that's trivial; between a home laptop
// and a phone on mobile data — both behind NAT/CGNAT — it usually is NOT, and
// STUN alone can't fix it. A TURN relay carries the media when direct fails,
// so without one, calls to remote peers silently have no audio/video path.
//
// Precedence: env-configured TURN (your own coturn — best) → otherwise a free
// public TURN fallback so remote calls work out of the box. Public TURN is
// rate-limited and not for production traffic; set REACT_APP_TURN_URL to your
// own relay for anything real.
const PUBLIC_STUN = [
  "stun:stun.l.google.com:19302",
  "stun:stun1.l.google.com:19302",
  "stun:global.stun.twilio.com:3478",
];

// Open Relay (Metered) free public TURN — verify/replace for production.
const PUBLIC_TURN = {
  urls: [
    "turn:openrelay.metered.ca:80",
    "turn:openrelay.metered.ca:443",
    "turn:openrelay.metered.ca:443?transport=tcp",
  ],
  username: "openrelayproject",
  credential: "openrelayproject",
};

function buildIceServers() {
  const servers = [{ urls: PUBLIC_STUN }];
  const turnUrls = (process.env.REACT_APP_TURN_URL || "")
    .split(",")
    .map((u) => u.trim())
    .filter(Boolean);
  if (turnUrls.length > 0) {
    servers.push({
      urls: turnUrls,
      username: process.env.REACT_APP_TURN_USERNAME || "",
      credential: process.env.REACT_APP_TURN_CREDENTIAL || "",
    });
  } else {
    servers.push(PUBLIC_TURN);
  }
  return servers;
}

const ICE_CONFIG = { iceServers: buildIceServers() };

const VIDEO_CONSTRAINTS = {
  width: { ideal: 1920 },
  height: { ideal: 1080 },
  frameRate: { ideal: 30, max: 60 },
};

const AUDIO_CONSTRAINTS = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  sampleRate: 48000,
  channelCount: 2,
};

const VIDEO_MAX_BITRATE = 4_000_000; // ~4 Mbps target, enough for crisp 1080p30

// Preferred codec order: VP9/AV1 give better quality per bit than VP8/H.264,
// at the cost of more CPU (no hardware encode on most devices).
const CODEC_PRIORITY = ["video/VP9", "video/AV1", "video/H264", "video/VP8"];

function sortCodecsByPriority(codecs) {
  return [...codecs].sort((a, b) => {
    const rank = (codec) => {
      const i = CODEC_PRIORITY.indexOf(codec.mimeType);
      return i === -1 ? CODEC_PRIORITY.length : i;
    };
    return rank(a) - rank(b);
  });
}

async function configureVideoSender(sender) {
  try {
    const params = sender.getParameters();
    if (!params.encodings || params.encodings.length === 0) {
      params.encodings = [{}];
    }
    params.encodings[0].maxBitrate = VIDEO_MAX_BITRATE;
    // Prioritize sharpness over frame rate when bandwidth gets tight.
    params.degradationPreference = "maintain-resolution";
    await sender.setParameters(params);
  } catch (err) {
    console.warn("Could not set video encoding parameters:", err);
  }
}

function preferVideoCodecs(pc, sender) {
  const transceiver = pc.getTransceivers().find((t) => t.sender === sender);
  if (!transceiver || typeof transceiver.setCodecPreferences !== "function") return;
  const caps = RTCRtpSender.getCapabilities("video");
  if (!caps) return;
  try {
    transceiver.setCodecPreferences(sortCodecsByPriority(caps.codecs));
  } catch (err) {
    console.warn("Could not set codec preferences:", err);
  }
}

export default function CameraGridController({ user, onLogout }) {
  const socketRef = useRef(null);
  const peersRef = useRef({});
  const localStreamRef = useRef(null);
  const broadcasterRef = useRef(null);

  const [remoteStreams, setRemoteStreams] = useState([]); // [{id, stream}]
  const [usernames, setUsernames] = useState({}); // socketId -> username
  const [userId, setUserId] = useState(null);
  // Prefill the room code from a shared invite link (?room=<code>).
  const [room, setRoom] = useState(
    () => new URLSearchParams(window.location.search).get("room")?.trim() || ""
  );
  const [roomError, setRoomError] = useState("");
  const [creating, setCreating] = useState(false);
  const [joined, setJoined] = useState(false);
  const [cameraStarted, setCameraStarted] = useState(false);
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [liveState, setLiveState] = useState("idle"); // idle | connecting | live | error
  const [sharing, setSharing] = useState(false);
  const [messages, setMessages] = useState([]); // [{from, username, text, ts}]
  // localStream mirrors localStreamRef for rendering; cameraPreview is a
  // separate MediaStream wrapping the (still-live) camera track while screen
  // sharing, so the UI can show a FaceTime-style self view alongside the
  // shared screen.
  const [localStream, setLocalStream] = useState(null);
  const [cameraPreview, setCameraPreview] = useState(null);
  const [presenterId, setPresenterId] = useState(null); // remote peer currently screen sharing
  const screenTrackRef = useRef(null);
  const cameraTrackRef = useRef(null);

  // --- WebRTC Logic ---

  const createPeerConnection = useCallback(async (peerId, isInitiator) => {
    if (peersRef.current[peerId]) return peersRef.current[peerId];

    const pc = new RTCPeerConnection(ICE_CONFIG);
    peersRef.current[peerId] = pc;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        const sender = pc.addTrack(track, localStreamRef.current);
        if (track.kind === "video") {
          preferVideoCodecs(pc, sender);
          configureVideoSender(sender);
        }
      });
    }

    pc.onicecandidate = (e) => {
      if (e.candidate && socketRef.current) {
        socketRef.current.emit("candidate", { to: peerId, candidate: e.candidate });
      }
    };

    pc.ontrack = (e) => {
      const remoteStream = e.streams[0];
      setRemoteStreams((prev) =>
        prev.find((p) => p.id === peerId) ? prev : [...prev, { id: peerId, stream: remoteStream }]
      );
    };

    if (isInitiator) {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socketRef.current.emit("offer", { to: peerId, sdp: offer });
      } catch (err) {
        console.error("Error creating offer:", err);
      }
    }

    return pc;
  }, []);

  // Payload is [{ id, username }] now that the signaling server authenticates
  // sockets and knows display names.
  const handleUsers = useCallback(async (users) => {
    setUsernames((prev) => {
      const next = { ...prev };
      users.forEach(({ id, username }) => { next[id] = username; });
      return next;
    });
    for (const { id } of users) {
      await createPeerConnection(id, true);
    }
  }, [createPeerConnection]);

  const handleReceiveOffer = useCallback(async ({ from, sdp }) => {
    await createPeerConnection(from, false);
    const pc = peersRef.current[from];
    if (!pc) return;
    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socketRef.current.emit("answer", { to: from, sdp: answer });
  }, [createPeerConnection]);

  const handleReceiveAnswer = useCallback(async ({ from, sdp }) => {
    const pc = peersRef.current[from];
    if (!pc) return;
    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
  }, []);

  const handleNewCandidate = useCallback(async ({ from, candidate }) => {
    const pc = peersRef.current[from];
    if (!pc) return;
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.warn("addIceCandidate error:", err);
    }
  }, []);

  // --- Socket Connection ---

  useEffect(() => {
    socketRef.current = io(SERVER_URL, {
      transports: ["websocket", "polling"],
      auth: { token: user.token },
    });

    socketRef.current.on("connect", () => {
      setUserId(socketRef.current.id);
      console.log("socket connected:", socketRef.current.id);
    });

    // Server rejects the handshake when the JWT is missing/expired — send the
    // user back through login rather than leaving them in a dead UI.
    socketRef.current.on("connect_error", (err) => {
      if (err && err.message === "unauthorized") {
        console.warn("socket auth failed — session expired, logging out");
        onLogout();
      }
    });

    socketRef.current.on("users", handleUsers);
    socketRef.current.on("offer", handleReceiveOffer);
    socketRef.current.on("answer", handleReceiveAnswer);
    socketRef.current.on("candidate", handleNewCandidate);

    // The new joiner initiates the WebRTC handshake (see users/offer flow),
    // so this event only carries their display name for the UI.
    socketRef.current.on("user-joined", ({ id, username }) => {
      setUsernames((prev) => ({ ...prev, [id]: username }));
      // Late joiners missed the original presenting event — re-announce.
      if (screenTrackRef.current) socketRef.current.emit("presenting", true);
    });

    // A peer started/stopped screen sharing — their share takes the stage.
    socketRef.current.on("presenting", ({ from, presenting }) => {
      setPresenterId((prev) => (presenting ? from : prev === from ? null : prev));
    });

    // Sender identity is attached server-side from the authed socket; the
    // sender receives their own message through this same event (no echo).
    socketRef.current.on("chat", (msg) => {
      setMessages((prev) => [...prev.slice(-199), msg]);
    });

    // Server refused the join (bad/expired code) — surface it, stay out.
    socketRef.current.on("join-error", (msg) => {
      setRoomError(msg || "Could not join that room.");
      setJoined(false);
    });

    socketRef.current.on("user-disconnected", (id) => {
      console.log("user-disconnected", id);
      const pc = peersRef.current[id];
      if (pc) pc.close();
      delete peersRef.current[id];
      setRemoteStreams((prev) => prev.filter((p) => p.id !== id));
      setPresenterId((prev) => (prev === id ? null : prev));
      setUsernames((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      Object.values(peersRef.current).forEach((pc) => pc && pc.close());
      peersRef.current = {};
    };
  }, [handleUsers, handleReceiveOffer, handleReceiveAnswer, handleNewCandidate, user.token, onLogout]);

  // --- Local Media Controls ---

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: VIDEO_CONSTRAINTS,
        audio: AUDIO_CONSTRAINTS,
      });
      // Nudges the encoder to prioritize per-frame sharpness over motion smoothness.
      stream.getVideoTracks().forEach((t) => (t.contentHint = "detail"));
      localStreamRef.current = stream;
      setLocalStream(stream);
      setCameraStarted(true);
    } catch (err) {
      console.error("getUserMedia error:", err.name, err.message);
      alert(`Camera error: ${err.message}`);
    }
  };

  const toggleCam = () => {
    if (!localStreamRef.current) return;
    const enabled = !camOn;
    localStreamRef.current.getVideoTracks().forEach((t) => (t.enabled = enabled));
    setCamOn(enabled);
  };

  const toggleMic = () => {
    if (!localStreamRef.current) return;
    const enabled = !micOn;
    localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = enabled));
    setMicOn(enabled);
  };

  // --- Screen share ---
  // Swaps the video track in-place: replaceTrack() on every peer's sender (no
  // renegotiation needed), and removeTrack/addTrack on the local MediaStream so
  // the PiP element and the broadcast composite both follow automatically.

  const replaceOutgoingVideoTrack = async (nextTrack) => {
    await Promise.all(
      Object.values(peersRef.current).map(async (pc) => {
        const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
        if (sender) {
          try { await sender.replaceTrack(nextTrack); } catch (err) { console.warn("replaceTrack failed:", err); }
        }
      })
    );
  };

  const stopScreenShare = useCallback(async () => {
    const screenTrack = screenTrackRef.current;
    const camTrack = cameraTrackRef.current;
    if (!screenTrack) return;
    screenTrack.onended = null;
    screenTrack.stop();
    const stream = localStreamRef.current;
    if (stream) {
      stream.removeTrack(screenTrack);
      if (camTrack) stream.addTrack(camTrack);
    }
    await Promise.all(
      Object.values(peersRef.current).map(async (pc) => {
        const sender = pc.getSenders().find((s) => s.track === screenTrack || (s.track && s.track.kind === "video"));
        if (sender) {
          try { await sender.replaceTrack(camTrack || null); } catch (err) { console.warn("replaceTrack failed:", err); }
        }
      })
    );
    screenTrackRef.current = null;
    cameraTrackRef.current = null;
    setCameraPreview(null);
    setSharing(false);
    socketRef.current?.emit("presenting", false);
  }, []);

  const toggleScreenShare = async () => {
    if (sharing) return stopScreenShare();
    if (!localStreamRef.current) {
      alert("Start your camera first.");
      return;
    }
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 30 } },
        audio: false,
      });
      const screenTrack = display.getVideoTracks()[0];
      screenTrack.contentHint = "text"; // favor legibility of shared content
      const stream = localStreamRef.current;
      const camTrack = stream.getVideoTracks()[0] || null;
      cameraTrackRef.current = camTrack;
      screenTrackRef.current = screenTrack;
      if (camTrack) stream.removeTrack(camTrack);
      stream.addTrack(screenTrack);
      await replaceOutgoingVideoTrack(screenTrack);
      // The browser's own "Stop sharing" bar ends the track out from under us.
      screenTrack.onended = () => stopScreenShare();
      // Camera keeps running while sharing — surface it separately so the UI
      // can show a FaceTime-style self view next to the shared screen.
      setCameraPreview(camTrack ? new MediaStream([camTrack]) : null);
      setSharing(true);
      socketRef.current?.emit("presenting", true);
    } catch (err) {
      // NotAllowedError = user dismissed the picker; not an error worth surfacing.
      if (err.name !== "NotAllowedError") console.error("getDisplayMedia error:", err);
    }
  };

  const sendChat = (text) => {
    if (socketRef.current && joined) socketRef.current.emit("chat", text);
  };

  // Reflect the current room in the URL so the tab's link is always a valid
  // invite others can open.
  const syncRoomToUrl = (code) => {
    const url = code ? `${window.location.origin}/?room=${code}` : window.location.origin + "/";
    window.history.replaceState(null, "", url);
  };

  const newRoom = async () => {
    setRoomError("");
    setCreating(true);
    try {
      const { code } = await createRoom(user.token);
      setRoom(code);
      syncRoomToUrl(code);
    } catch (err) {
      setRoomError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const joinRoom = () => {
    setRoomError("");
    if (!cameraStarted) {
      setRoomError("Start your camera before joining.");
      return;
    }
    const code = room.trim();
    if (!code) {
      setRoomError("Paste an invite code, or create a new room.");
      return;
    }
    syncRoomToUrl(code);
    socketRef.current.emit("join-room", code);
    setMessages([]);
    setJoined(true);
  };

  // --- Go Live (director mode) ---
  // This client composites the whole call and pushes one stream to drover,
  // which fans it out as an ABR HLS ladder to any number of viewers.

  const broadcastStreams = useCallback(
    () => [{ id: "local", stream: localStreamRef.current }, ...remoteStreams],
    [remoteStreams]
  );

  const goLive = () => {
    if (!joined || !DROVER_URL || broadcasterRef.current) return;
    const key = streamKeyForRoom(room.trim());
    const b = new Broadcaster(`${DROVER_WS}/ingest/${key}`, (state) => {
      setLiveState(state);
      if (state === "idle" || state === "error") broadcasterRef.current = null;
    });
    broadcasterRef.current = b;
    b.start(broadcastStreams());
  };

  const endLive = useCallback(() => {
    if (broadcasterRef.current) broadcasterRef.current.stop();
  }, []);

  // Keep the composite in sync as peers join/leave mid-broadcast.
  useEffect(() => {
    if (broadcasterRef.current) broadcasterRef.current.setStreams(broadcastStreams());
  }, [broadcastStreams]);

  // End the broadcast if the component unmounts (e.g. logout).
  useEffect(() => endLive, [endLive]);

  const leaveRoom = () => {
    if (!joined) return;
    endLive();
    if (sharing) stopScreenShare();
    Object.values(peersRef.current).forEach((pc) => pc && pc.close());
    peersRef.current = {};
    setRemoteStreams([]);
    setMessages([]);
    setPresenterId(null);
    socketRef.current.emit("leave-room");
    setJoined(false);
  };

  const watchUrl = joined && DROVER_URL ? `${DROVER_URL}/watch.html?key=${streamKeyForRoom(room.trim())}` : null;

  return (
    <CameraGridUI
      localStream={localStream}
      cameraPreview={cameraPreview}
      remoteStreams={remoteStreams}
      usernames={usernames}
      userId={userId}
      username={user.username}
      onLogout={onLogout}
      room={room}
      setRoom={setRoom}
      roomError={roomError}
      creating={creating}
      newRoom={newRoom}
      shareUrl={room ? `${window.location.origin}/?room=${room}` : null}
      joined={joined}
      cameraStarted={cameraStarted}
      startCamera={startCamera}
      joinRoom={joinRoom}
      leaveRoom={leaveRoom}
      camOn={camOn}
      micOn={micOn}
      toggleCam={toggleCam}
      toggleMic={toggleMic}
      presenterId={presenterId}
      canGoLive={Boolean(DROVER_URL)}
      liveState={liveState}
      goLive={goLive}
      endLive={endLive}
      watchUrl={watchUrl}
      sharing={sharing}
      toggleScreenShare={toggleScreenShare}
      messages={messages}
      sendChat={sendChat}
    />
  );
}