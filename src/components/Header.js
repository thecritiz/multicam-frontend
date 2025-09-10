// src/components/Header.js
import React from "react";

export default function Header() {
  return (
    <header className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-2xl font-bold">🎥 WebRTC Dashboard</h1>
        <nav className="space-x-6">
          <button className="hover:underline">Home</button>
<button className="hover:underline">Features</button>
<button className="hover:underline">About</button>

        </nav>
      </div>
    </header>
  );
}
