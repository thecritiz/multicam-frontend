import React, { useState } from "react";
import CameraGrid from "./components/CameraGridController";
import AccessPage from "./components/AccessPage";

function App() {
  const [accessGranted, setAccessGranted] = useState(false);

  if (!accessGranted) {
    return <AccessPage onAccessGranted={() => setAccessGranted(true)} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Main content */}
      <main className="flex-1 container mx-auto p-6 space-y-12">
        {/* Camera grid section */}
        <CameraGrid />
      </main> 
    </div>
  );
}

export default App;
