import React, { useState } from "react";
import Header from "./components/Header";
import Timeline from "./components/Timeline";
import Workflow from "./components/Workflow";
import CameraGrid from "./components/CameraGridController";
import Footer from "./components/Footer";
import AccessPage from "./components/AccessPage";

function App() {
  const [accessGranted, setAccessGranted] = useState(false);

  if (!accessGranted) {
    return <AccessPage onAccessGranted={() => setAccessGranted(true)} />;
  }

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
