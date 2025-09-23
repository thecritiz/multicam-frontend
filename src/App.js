// App.js
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Home from "./components/Home";
import CameraGrid from "./components/CameraGrid";
import Header from "./components/Header";
import Footer from "./components/Footer";
import AccessPage from "./components/AccessPage";

// 🔐 simple wrapper to protect routes
function ProtectedRoute({ children }) {
  const verified = localStorage.getItem("verified") === "true";
  return verified ? children : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Access page */}
        <Route path="/" element={<AccessPage />} />

        {/* Main homepage (protected) */}
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <div className="min-h-screen flex flex-col bg-gray-50">
                <Header />
                <main className="flex-1 container mx-auto p-6">
                  <Home />
                </main>
                <Footer />
              </div>
            </ProtectedRoute>
          }
        />

        {/* Meeting Room (protected) */}
        <Route
          path="/room/:roomId"
          element={
            <ProtectedRoute>
              <div className="min-h-screen flex flex-col bg-gray-50">
                <Header />
                <main className="flex-1 container mx-auto p-6">
                  <CameraGrid />
                </main>
                <Footer />
              </div>
            </ProtectedRoute>
          }
        />

        {/* Redirect unknown paths to access page */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
