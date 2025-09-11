// CameraGrid.js
import React, { useRef, useState, useEffect } from "react";
import { io } from "socket.io-client";
import { useParams } from "react-router-dom";

const SERVER_URL = "https://multicam-backend.onrender.com";
const ICE_CONFIG = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

export default function CameraGrid() {
  const { roomId } = useParams(); // URL room param
  const localVideoRef = useRef(null);
  const socketRef = useRef(null);
  const peersRef = useRef({});
  const localStreamRef = useRef(null);

  const [remoteStreams, setRemoteStreams] = useState([]);
  const [userId, setUserId] = useState(null);
  const [cameraStarted, setCameraStarted] = useState(false);

  useEffect(() => {
    socketRef.current = io(SERVER_URL, { transports: ["websocket", "polling"] });

    socketRef.current.on("connect", () => setUserId(socketRef.current.id));

    socketRef.current.on("users", handleUsers);
    socketRef.current.on("offer", handleReceiveOffer);
    socketRef.current.on("answer", handleReceiveAnswer);
    socketRef.current.on("candidate", handleNewCandidate);
    socketRef.current.on("user-disconnected", handleUserDisconnected);

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
      Object.values(peersRef.current).forEach((pc) => pc.close());
      peersRef.current = {};
    };
  }, []);

  useEffect(() => {
    if (cameraStarted && roomId) joinRoom(roomId);
  }, [cameraStarted, roomId]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localVideoRef.current.srcObject = stream;
      localVideoRef.current.muted = true;
      localStreamRef.current = stream;
      setCameraStarted(true);
    } catch (err) {
      alert("Cannot access camera/mic. Check permissions.");
    }
  };

  const joinRoom = (room) => {
    socketRef.current.emit("join-room", room);
  };

  const handleUsers = async (users) => {
    for (const peerId of users) await createPeerConnection(peerId, true);
  };

  const createPeerConnection = async (peerId, isInitiator) => {
    if (peersRef.current[peerId]) return peersRef.current[peerId];

    const pc = new RTCPeerConnection(ICE_CONFIG);
    peersRef.current[peerId] = pc;

    if (localStreamRef.current)
      localStreamRef.current.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current));

    pc.onicecandidate = (e) => {
      if (e.candidate) socketRef.current.emit("candidate", { to: peerId, candidate: e.candidate });
    };

    pc.ontrack = (e) => {
      const remoteStream = e.streams[0];
      setRemoteStreams((prev) => (prev.find((p) => p.id === peerId) ? prev : [...prev, { id: peerId, stream: remoteStream }]));
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
    } catch {}
  };

  const handleUserDisconnected = (id) => {
    const pc = peersRef.current[id];
    if (pc) pc.close();
    delete peersRef.current[id];
    setRemoteStreams((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <section className="py-6 bg-gray-100 min-h-screen">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-2xl font-bold mb-4 text-center">Meeting Room</h2>
        <button
          onClick={startCamera}
          className="px-4 py-2 bg-blue-600 text-white rounded mb-4 hover:bg-blue-700"
          disabled={cameraStarted}
        >
          {cameraStarted ? "Camera Started" : "Start Camera"}
        </button>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          <div className="relative bg-black rounded overflow-hidden">
            <video ref={localVideoRef} autoPlay playsInline className="w-full h-48 object-cover" />
            <div className="absolute bottom-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
              You ({userId?.slice(0, 5)})
            </div>
          </div>

          {remoteStreams.map((s) => (
            <div key={s.id} className="relative bg-black rounded overflow-hidden">
              <video ref={(ref) => ref && (ref.srcObject = s.stream)} autoPlay playsInline className="w-full h-48 object-cover" />
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
