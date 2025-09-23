// App.js
import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./components/Home";
import CameraGrid from "./components/CameraGrid";
import Header from "./components/Header";
import Footer from "./components/Footer";
import AccessPage from "./components/AccessPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Access verification */}
        <Route path="/access" element={<AccessPage />} />

        {/* Landing Page (protected) */}
        <Route
          path="/"
          element={
            <RequireAuth>
              <div className="min-h-screen flex flex-col bg-gray-50">
                <Header />
                <main className="flex-1 container mx-auto p-6">
                  <Home />
                </main>
                <Footer />
              </div>
            </RequireAuth>
          }
        />

        {/* Meeting Room (protected) */}
        <Route
          path="/room/:roomId"
          element={
            <RequireAuth>
              <div className="min-h-screen flex flex-col bg-gray-50">
                <Header />
                <main className="flex-1 container mx-auto p-6">
                  <CameraGrid />
                </main>
                <Footer />
              </div>
            </RequireAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

// 🔒 Wrapper component to enforce access
function RequireAuth({ children }) {
  const verified = localStorage.getItem("verified") === "true";
  if (!verified) {
    window.location.href = "/access"; // redirect if not verified
    return null;
  }
  return children;
}
