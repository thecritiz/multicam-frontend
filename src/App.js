// App.js
import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./components/Home";
import CameraGrid from "./components/CameraGrid";
import Header from "./components/Header";
import Footer from "./components/Footer";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <div className="min-h-screen flex flex-col bg-gray-50">
              <Header />
              <main className="flex-1 container mx-auto p-6">
                <Home />
              </main>
              <Footer />
            </div>
          }
        />
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
