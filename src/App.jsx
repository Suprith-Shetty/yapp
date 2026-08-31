import React, { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import ChatApp from "./pages/ChatApp.jsx";
import ProfileSetup from "./pages/ProfileSetup.jsx";
import SplashScreen from "./components/SplashScreen.jsx";
import Logo from "./components/Logo.jsx";

function Shell() {
  const { user, restoring, needsProfileSetup } = useAuth();
  const [showSplash, setShowSplash] = useState(true);

  // Splash timing/content is unchanged regardless of session-restore —
  // it always plays exactly the same way.
  if (showSplash) return <SplashScreen onDone={() => setShowSplash(false)} />;

  // Session restore (validating a saved token) can still be in flight
  // right after the splash ends — show a minimal loading state instead
  // of flashing the login screen before snapping to the chat app.
  if (restoring) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-deepest)" }}>
        <Logo size={44} />
      </div>
    );
  }

  if (!user) return <AuthPage />;
  if (needsProfileSetup) return <ProfileSetup />;
  return <ChatApp />;
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}
