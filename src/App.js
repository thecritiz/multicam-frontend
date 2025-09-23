// App.js
import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Import all necessary components
import Home from "./components/Home";
import CameraGrid from "./components/CameraGrid";
import Header from "./components/Header";
import Footer from "./components/Footer";
import AccessPage from "./components/AccessPage"; // <-- Import AccessPage

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Route for the Access Page at the root */}
        <Route path="/" element={<AccessPage />} />

        {/* Route for the Home Page */}
        <Route
          path="/home"
          element={
            <div className="min-h-screen flex flex-col bg-gray-50">
              <Header />
              <main className="flex-1 container mx-auto p-6 flex items-center justify-center">
                <Home />
              </main>
              <Footer />
            </div>
          }
        />

        {/* Route for the Meeting Room */}
        <Route
          path="/room/:roomId"
          element={
            <div className="min-h-screen flex flex-col bg-gray-50">
              <Header />
              <main className="flex-1 container mx-auto p-6">
                <CameraGrid />
              </main>
              <Footer />
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}