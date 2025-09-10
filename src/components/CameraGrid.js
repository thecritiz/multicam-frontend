// src/components/CameraGrid.js
import React, { useRef, useState, useEffect } from "react";
import { io } from "socket.io-client";

const SERVER_URL = "https://multicam-backend.onrender.com/"; 

const ICE_CONFIG = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

export default function CameraGrid() {
  const localVideoRef = useRef(null);
  const socketRef = useRef(null);
  const peersRef = useRef({});
  const localStreamRef = useRef(null);

  const [remoteStreams, setRemoteStreams] = useState([]);

  useEffect(() => {
    socketRef.current = io(SERVER_URL);
    socketRef.current.on("connect", () => console.log("Connected:", socketRef.current.id));
    socketRef.current.on("users", handleUsers);
    socketRef.current.on("offer", handleReceiveOffer);
    socketRef.current.on("answer", handleReceiveAnswer);
    socketRef.current.on("candidate", handleNewCandidate);
    socketRef.current.on("user-disconnected", handleUserDisconnected);

    return () => socketRef.current.disconnect();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localVideoRef.current.srcObject = stream;
      localVideoRef.current.muted = true;
      localStreamRef.current = stream;
      socketRef.current.emit("join");
    } catch (err) {
      console.error("getUserMedia error:", err);
      alert("Cannot access camera/mic. Check permissions.");
    }
  };

  const handleUsers = async (users) => {
    for (const userId of users) await createPeerConnection(userId, true);
  };

  const createPeerConnection = async (peerId, isInitiator) => {
    if (peersRef.current[peerId]) return peersRef.current[peerId];

    const pc = new RTCPeerConnection(ICE_CONFIG);
    peersRef.current[peerId] = pc;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current));
    }

    pc.onicecandidate = e => {
      if (e.candidate) socketRef.current.emit("candidate", { to: peerId, candidate: e.candidate });
    };

    pc.ontrack = e => {
      const remoteStream = e.streams[0];
      setRemoteStreams(prev => prev.find(p => p.id === peerId) ? prev : [...prev, { id: peerId, stream: remoteStream }]);
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
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
  };

  const handleUserDisconnected = (id) => {
    const pc = peersRef.current[id];
    if (pc) pc.close();
    delete peersRef.current[id];
    setRemoteStreams(prev => prev.filter(p => p.id !== id));
  };

  return (
    <section id="camera" className="py-12 bg-gray-100">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-3xl font-bold mb-6 text-center">Camera Grid</h2>
        <button onClick={startCamera} className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Start Camera
        </button>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <p className="font-bold">You</p>
            <video ref={localVideoRef} autoPlay playsInline className="w-full h-48 bg-black" />
          </div>
          {remoteStreams.map(s => (
            <div key={s.id}>
              <p className="font-bold">Peer: {s.id}</p>
              <video ref={ref => ref && (ref.srcObject = s.stream)} autoPlay playsInline className="w-full h-48 bg-black" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
