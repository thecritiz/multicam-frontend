// src/App.js
import React from "react";
import Header from "./components/Header";
import Timeline from "./components/Timeline";
import Workflow from "./components/Workflow";
import CameraGrid from "./components/CameraGrid";
import Footer from "./components/Footer";

function App() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <Header />

      {/* Main content */}
      <main className="flex-1 container mx-auto p-6 space-y-12">
        {/* Camera grid section */}
        <CameraGrid />

        {/* Development timeline */}
        <Timeline />

        {/* Workflow section */}
        <Workflow />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default App;
