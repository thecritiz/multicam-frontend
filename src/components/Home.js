// Home.js
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";

export default function Home() {
  const navigate = useNavigate();

  const createRoom = () => {
    const newRoomId = uuidv4();
    navigate(`/room/${newRoomId}`);
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <h1 className="text-4xl font-bold mb-6">Welcome to MultiCam Meet</h1>
      <button
        onClick={createRoom}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700"
      >
        Start a Meeting
      </button>
    </div>
  );
}
