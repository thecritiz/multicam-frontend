// src/components/AccessPage.js
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function AccessPage() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Hardcoded for demo — later fetch from backend or env
  const ACCESS_CODE = "FYP2025";

  const handleSubmit = (e) => {
    e.preventDefault();
    if (code.trim() === ACCESS_CODE) {
      localStorage.setItem("verified", "true"); // persist access
      navigate("/home"); // ✅ redirect to homepage with UI
    } else {
      setError("❌ Invalid access code");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <h1 className="text-3xl font-bold mb-4">Enter Access Code</h1>
      <form
        onSubmit={handleSubmit}
        className="flex flex-col items-center gap-4 bg-white shadow-md p-6 rounded-lg"
      >
        <input
          type="password"
          placeholder="Access Code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="px-4 py-2 border rounded w-64"
        />
        <button
          type="submit"
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 w-64"
        >
          Submit
        </button>
        {error && <div className="text-red-600 mt-2">{error}</div>}
      </form>
    </div>
  );
}
