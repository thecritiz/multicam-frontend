// Timeline.js
import React from "react";

export default function Timeline() {
  return (
    <section className="py-12 bg-gray-50">
      <div className="max-w-5xl mx-auto px-4">
        <h2 className="text-3xl font-bold mb-6 text-center">Development Timeline</h2>
        <ul className="space-y-4">
          <li className="p-4 bg-white rounded-lg shadow">
            <b>Week 1:</b> Setup signaling server + React app
          </li>
          <li className="p-4 bg-white rounded-lg shadow">
            <b>Week 2:</b> WebRTC peer-to-peer connections
          </li>
          <li className="p-4 bg-white rounded-lg shadow">
            <b>Week 3:</b> Multi-peer handling + UI design
          </li>
          <li className="p-4 bg-white rounded-lg shadow">
            <b>Week 4:</b> Testing, polish, and deployment
          </li>
        </ul>
      </div>
    </section>
  );
}
