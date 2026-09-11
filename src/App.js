import React, { useState } from "react";
import CameraGrid from "./components/CameraGridController";
import AuthPage from "./components/AuthPage";
import { getSession, saveSession, clearSession } from "./auth";

function App() {
  const [session, setSession] = useState(getSession);

  const handleLogout = () => {
    clearSession();
    setSession(null);
  };

  if (!session) {
    return (
      <AuthPage
        onAuth={(s) => {
          saveSession(s);
          setSession(s);
        }}
      />
    );
  }

  return <CameraGrid user={session} onLogout={handleLogout} />;
}

export default App;
