import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import AccessPage from "./components/AccessPage";
import Home from "./components/Home";
import CameraGrid from "./components/CameraGrid";
import Header from "./components/Header";
import Footer from "./components/Footer";

export default function App() {
  const isVerified = localStorage.getItem("verified") === "true";

  return (
    <BrowserRouter>
      <Routes>
        {/* Access Page */}
        <Route
          path="/access"
          element={<AccessPage />}
        />

        {/* Landing / Home — only if verified */}
        <Route
          path="/"
          element={
            !isVerified ? <Navigate to="/access" replace /> : (
              <div className="min-h-screen flex flex-col bg-gray-50">
                <Header />
                <main className="flex-1 container mx-auto p-6">
                  <Home />
                </main>
                <Footer />
              </div>
            )
          }
        />

        {/* Meeting Room — only if verified */}
        <Route
          path="/room/:roomId"
          element={
            !isVerified ? <Navigate to="/access" replace /> : (
              <div className="min-h-screen flex flex-col bg-gray-50">
                <Header />
                <main className="flex-1 container mx-auto p-6">
                  <CameraGrid />
                </main>
                <Footer />
              </div>
            )
          }
        />

    
      </Routes>
    </BrowserRouter>
  );
}
