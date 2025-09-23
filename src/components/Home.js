// Home.js
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { v4 as uuidv4 } from "uuid";

export default function Home() {
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState("");

  const createRoom = () => {
    const newRoomId = uuidv4();
    navigate(`/room/${newRoomId}`);
  };

  const joinRoom = () => {
    if (!roomCode.trim()) return alert("Enter a room code");
    navigate(`/room/${roomCode.trim()}`);
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100 gap-4">
      <h1 className="text-4xl font-bold mb-6">Welcome to MultiCam Meet</h1>

      <button
        onClick={createRoom}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700"
      >
        Start a New Meeting
      </button>

      <div className="flex gap-2">
        <input
          type="text"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value)}
          placeholder="Enter Room Code"
          className="px-3 py-2 border rounded"
        />
        <button
          onClick={joinRoom}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Join Meeting
        </button>
      </div>
    </div>
  );
}
