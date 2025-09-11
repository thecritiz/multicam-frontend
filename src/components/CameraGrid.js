// src/components/CameraGrid.js
import React, { useRef, useState, useEffect } from "react";
import { io } from "socket.io-client";

const SERVER_URL = "https://multicam-backend.onrender.com"; // ✅ use deployed backend
const ICE_CONFIG = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

export default function CameraGrid() {
  const localVideoRef = useRef(null);
  const socketRef = useRef(null);
  const peersRef = useRef({});
  const localStreamRef = useRef(null);

  const [remoteStreams, setRemoteStreams] = useState([]);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    socketRef.current = io(SERVER_URL);

    socketRef.current.on("connect", () => {
      setUserId(socketRef.current.id);
      console.log("Connected:", socketRef.current.id);
    });

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
      setRemoteStreams(prev =>
        prev.find(p => p.id === peerId) ? prev : [...prev, { id: peerId, stream: remoteStream }]
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
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
  };

  const handleUserDisconnected = (id) => {
    const pc = peersRef.current[id];
    if (pc) pc.close();
    delete peersRef.current[id];
    setRemoteStreams(prev => prev.filter(p => p.id !== id));
  };

  return (
    <section id="camera" className="py-12 bg-gray-100 min-h-screen">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-3xl font-bold mb-6 text-center">Camera Grid</h2>

        {/* Start Button */}
        <div className="flex justify-center mb-6">
          <button
            onClick={startCamera}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl shadow hover:bg-blue-700 transition"
          >
            Start Camera
          </button>
        </div>

        {/* Video Grid */}
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {/* Local Stream */}
          <div className="relative rounded-xl overflow-hidden shadow-lg bg-black">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              className="w-full h-48 object-cover"
            />
            <div className="absolute bottom-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
              You ({userId?.slice(0, 5)})
            </div>
          </div>

          {/* Remote Streams */}
          {remoteStreams.map(s => (
            <div
              key={s.id}
              className="relative rounded-xl overflow-hidden shadow-lg bg-black"
            >
              <video
                ref={ref => ref && (ref.srcObject = s.stream)}
                autoPlay
                playsInline
                className="w-full h-48 object-cover"
              />
              <div className="absolute bottom-2 left-2 bg-gray-800 text-white text-xs px-2 py-1 rounded">
                Peer ({s.id.slice(0, 5)})
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
