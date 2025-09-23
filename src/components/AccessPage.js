// src/components/AccessPage.js
import React, { useState } from "react";

export default function AccessPage({ onAccessGranted }) {
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState("");

  const correctCode = "letmein"; // 🔑 Replace with your access code

  const handleSubmit = (e) => {
    e.preventDefault();
    if (accessCode === correctCode) {
      onAccessGranted(); // unlock the main app
    } else {
      setError("Incorrect code. Try again.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-3xl font-bold mb-6">Enter Access Code</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="password"
          value={accessCode}
          onChange={(e) => setAccessCode(e.target.value)}
          placeholder="Access code"
          className="px-4 py-2 border rounded"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Enter
        </button>
        {error && <p className="text-red-600">{error}</p>}
      </form>
    </div>
  );
}
