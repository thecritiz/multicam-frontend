// src/components/CameraGrid.js
import React, { useRef, useState, useEffect } from "react";
import { io } from "socket.io-client";
import CameraGridUI from "./CameraGridUI";
const SERVER_URL = "https://multicam-backend.onrender.com"; // <- deployed backend URL
const ICE_CONFIG = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

export default function CameraGrid() {
  const localVideoRef = useRef(null);
  const socketRef = useRef(null);
  const peersRef = useRef({});
  const localStreamRef = useRef(null);

  const [remoteStreams, setRemoteStreams] = useState([]); // [{id, stream}]
  const [userId, setUserId] = useState(null);
  const [room, setRoom] = useState("");
  const [joined, setJoined] = useState(false);
  const [cameraStarted, setCameraStarted] = useState(false);
  const [camOn, setCamOn] = useState(true);
const [micOn, setMicOn] = useState(true);

const toggleCam = () => {
  if (!localStreamRef.current) return;
  const enabled = !camOn;
  localStreamRef.current.getVideoTracks().forEach(t => (t.enabled = enabled));
  setCamOn(enabled);
};

const toggleMic = () => {
  if (!localStreamRef.current) return;
  const enabled = !micOn;
  localStreamRef.current.getAudioTracks().forEach(t => (t.enabled = enabled));
  setMicOn(enabled);
};

  useEffect(() => {
    socketRef.current = io(SERVER_URL, { transports: ["websocket", "polling"] });

    socketRef.current.on("connect", () => {
      setUserId(socketRef.current.id);
      console.log("socket connected:", socketRef.current.id);
    });

    socketRef.current.on("users", handleUsers);
    socketRef.current.on("offer", handleReceiveOffer);
    socketRef.current.on("answer", handleReceiveAnswer);
    socketRef.current.on("candidate", handleNewCandidate);

    socketRef.current.on("user-disconnected", (id) => {
      console.log("user-disconnected", id);
      const pc = peersRef.current[id];
      if (pc) pc.close();
      delete peersRef.current[id];
      setRemoteStreams((prev) => prev.filter((p) => p.id !== id));
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      Object.values(peersRef.current).forEach((pc) => pc.close());
      peersRef.current = {};
    };
  }, []);

  // After cameraStarted flips true, the PiP <video> mounts.
// This effect runs after that mount and safely assigns srcObject.
useEffect(() => {
  if (cameraStarted && localVideoRef.current && localStreamRef.current) {
    localVideoRef.current.srcObject = localStreamRef.current;
    localVideoRef.current.muted = true;
  }
}, [cameraStarted]);

const startCamera = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localStreamRef.current = stream; // store stream first
    setCameraStarted(true);          // flip state → PiP mounts → useEffect assigns srcObject
  } catch (err) {
    console.error("getUserMedia error:", err.name, err.message);
    const messages = {
      NotAllowedError:  "Permission denied. Click the lock icon → allow Camera & Mic → reload.",
      NotFoundError:    "No camera or microphone found on this device.",
      NotReadableError: "Camera is already in use by another app. Close it and retry.",
      SecurityError:    "Camera blocked — must be on HTTPS or localhost.",
    };
    alert(messages[err.name] || `Camera error: ${err.name} — ${err.message}`);
  }
};

  // join a room
  const joinRoom = () => {
    if (!cameraStarted) {
      alert("Please Start Camera before joining a room.");
      return;
    }
    if (!room || room.trim() === "") {
      alert("Enter a room name.");
      return;
    }
    // 🔧 FIXED: send room name as plain string
    socketRef.current.emit("join-room", room.trim());
    setJoined(true);
  };

  // leave the room
  const leaveRoom = () => {
    if (!joined) return;
    Object.values(peersRef.current).forEach((pc) => pc.close());
    peersRef.current = {};
    setRemoteStreams([]);
    socketRef.current.emit("leave-room");
    setJoined(false);
  };

  const handleUsers = async (users) => {
    for (const userId of users) {
      await createPeerConnection(userId, true);
    }
  };

  const createPeerConnection = async (peerId, isInitiator) => {
    if (peersRef.current[peerId]) return peersRef.current[peerId];

    const pc = new RTCPeerConnection(ICE_CONFIG);
    peersRef.current[peerId] = pc;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => pc.addTrack(track, localStreamRef.current));
    }

    pc.onicecandidate = (e) => {
      if (e.candidate) {
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
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketRef.current.emit("offer", { to: peerId, sdp: offer });
    }

    return pc;
  };

  const handleReceiveOffer = async ({ from, sdp }) => {
    await createPeerConnection(from, false);
    const pc = peersRef.current[from];
    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socketRef.current.emit("answer", { to: from, sdp: answer });
  };

  const handleReceiveAnswer = async ({ from, sdp }) => {
    const pc = peersRef.current[from];
    if (!pc) return;
    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
  };

  const handleNewCandidate = async ({ from, candidate }) => {
    const pc = peersRef.current[from];
    if (!pc) return;
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.warn("addIceCandidate error:", err);
    }
  };

  return (
  <CameraGridUI
  localVideoRef={localVideoRef}
  remoteStreams={remoteStreams}
  userId={userId}
  room={room}
  setRoom={setRoom}
  joined={joined}
  cameraStarted={cameraStarted}
  startCamera={startCamera}
  joinRoom={joinRoom}
  leaveRoom={leaveRoom}
  camOn={camOn}
  micOn={micOn}
  toggleCam={toggleCam}
  toggleMic={toggleMic}
/>
);
}