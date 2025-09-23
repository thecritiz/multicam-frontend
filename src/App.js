// src/App.js
import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Header from "./components/Header";
import Timeline from "./components/Timeline";
import Workflow from "./components/Workflow";
import Footer from "./components/Footer";
import Home from "./components/Home";
import MeetingRoom from "./components/MeetingRoom";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing Page */}
        <Route
          path="/"
          element={
            <div className="min-h-screen flex flex-col bg-gray-50">
              <Header />
              <main className="flex-1 container mx-auto p-6 space-y-12">
                <Home />
                <Timeline />
                <Workflow />
              </main>
              <Footer />
            </div>
          }
        />

        {/* Meeting Room */}
        <Route path="/room/:roomId" element={<MeetingRoom />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
