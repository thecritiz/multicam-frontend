// src/components/Workflow.js
import React from "react";

export default function Workflow() {
  return (
    <section id="workflow" className="py-12 bg-white">
      <div className="max-w-5xl mx-auto px-4">
        <h2 className="text-3xl font-bold mb-6 text-center">Workflow & Procedures</h2>
        <ol className="list-decimal list-inside space-y-3">
          <li>Set up signaling server (Node + Socket.io).</li>
          <li>Initialize React frontend with camera access.</li>
          <li>Establish WebRTC peer connections for multi-camera streaming.</li>
          <li>Design UI: camera grid, timeline, and control panels.</li>
          <li>Test multi-device streaming and debug connectivity.</li>
        </ol>
      </div>
    </section>
  );
}
