// src/components/CameraGrid.js
import React, { useRef, useState, useEffect } from "react";
import { io } from "socket.io-client";

const SERVER_URL = "https://multicam-backend.onrender.com"; // <- set your deployed backend URL
const ICE_CONFIG = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

export default function CameraGrid() {
  const localVideoRef = useRef(null);
  const socketRef = useRef(null);
  const peersRef = useRef({}); // map peerId -> RTCPeerConnection
  const localStreamRef = useRef(null);

  const [remoteStreams, setRemoteStreams] = useState([]); // [{id, stream}]
  const [userId, setUserId] = useState(null);
  const [room, setRoom] = useState("");
  const [joined, setJoined] = useState(false);
  const [cameraStarted, setCameraStarted] = useState(false);

  useEffect(() => {
    // connect socket on mount
    socketRef.current = io(SERVER_URL, { transports: ["websocket", "polling"] });

    socketRef.current.on("connect", () => {
      setUserId(socketRef.current.id);
      console.log("socket connected:", socketRef.current.id);
    });

    // list of peers in the room (sent only to the joining client)
    socketRef.current.on("users", handleUsers);

    // standard signaling messages
    socketRef.current.on("offer", handleReceiveOffer);
    socketRef.current.on("answer", handleReceiveAnswer);
    socketRef.current.on("candidate", handleNewCandidate);

    // when someone else disconnects / leaves the room
    socketRef.current.on("user-disconnected", (id) => {
      console.log("user-disconnected", id);
      const pc = peersRef.current[id];
      if (pc) pc.close();
      delete peersRef.current[id];
      setRemoteStreams((prev) => prev.filter((p) => p.id !== id));
    });

    return () => {
      // cleanup on unmount
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      // close all peer connections
      Object.values(peersRef.current).forEach((pc) => pc.close());
      peersRef.current = {};
    };
  }, []);

  // start local camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localVideoRef.current.srcObject = stream;
      localVideoRef.current.muted = true;
      localStreamRef.current = stream;
      setCameraStarted(true);
    } catch (err) {
      console.error("getUserMedia error:", err);
      alert("Cannot access camera/mic. Check permissions.");
    }
  };

  // join a room (must start camera before joining)
  const joinRoom = () => {
    if (!cameraStarted) {
      alert("Please Start Camera before joining a room.");
      return;
    }
    if (!room || room.trim() === "") {
      alert("Enter a room name.");
      return;
    }
    socketRef.current.emit("join-room", { room: room.trim() });
    setJoined(true);
  };

  // leave the current room
  const leaveRoom = () => {
    if (!joined) return;
    // close peer connections
    Object.values(peersRef.current).forEach((pc) => pc.close());
    peersRef.current = {};
    setRemoteStreams([]);
    socketRef.current.emit("leave-room");
    setJoined(false);
  };

  // when the server returns a list of existing users in the room,
  // create connections (we are the initiator for these)
  const handleUsers = async (users) => {
    for (const userId of users) {
      await createPeerConnection(userId, true);
    }
  };

  const createPeerConnection = async (peerId, isInitiator) => {
    if (peersRef.current[peerId]) return peersRef.current[peerId];

    const pc = new RTCPeerConnection(ICE_CONFIG);
    peersRef.current[peerId] = pc;

    // add local tracks
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
      setRemoteStreams((prev) => (prev.find((p) => p.id === peerId) ? prev : [...prev, { id: peerId, stream: remoteStream }]));
    };

    if (isInitiator) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketRef.current.emit("offer", { to: peerId, sdp: offer });
    }

    return pc;
  };

  // when we receive an offer from a peer
  const handleReceiveOffer = async ({ from, sdp }) => {
    await createPeerConnection(from, false);
    const pc = peersRef.current[from];
    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socketRef.current.emit("answer", { to: from, sdp: answer });
  };

  // when we receive an answer to our offer
  const handleReceiveAnswer = async ({ from, sdp }) => {
    const pc = peersRef.current[from];
    if (!pc) return;
    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
  };

  // ICE candidate forwarding
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
    <section id="camera" className="py-12 bg-gray-100 min-h-screen">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-3xl font-bold mb-6 text-center">Camera Grid (Rooms)</h2>

        <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-6">
          <div className="flex gap-2">
            <button
              onClick={startCamera}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              disabled={cameraStarted}
            >
              {cameraStarted ? "Camera Started" : "Start Camera"}
            </button>
          </div>

          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="Enter room name"
              className="px-3 py-2 border rounded"
            />
            {!joined ? (
              <button onClick={joinRoom} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                Join Room
              </button>
            ) : (
              <button onClick={leaveRoom} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
                Leave Room
              </button>
            )}
          </div>

          <div className="text-sm text-gray-600">
            {userId && <div>Socket ID: {userId.slice(0, 6)} {joined && <span> • Room: {room}</span>}</div>}
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {/* Local */}
          <div className="relative rounded-xl overflow-hidden shadow-lg bg-black">
            <video ref={localVideoRef} autoPlay playsInline className="w-full h-48 object-cover" />
            <div className="absolute bottom-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
              You ({userId?.slice(0, 5)})
            </div>
          </div>

          {/* Remote */}
          {remoteStreams.map((s) => (
            <div key={s.id} className="relative rounded-xl overflow-hidden shadow-lg bg-black">
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
