import React, { useEffect, useState } from "react";
import Logo from "./Logo.jsx";
import "./SplashScreen.css";

// Timing (ms) -- logo pops in, dots keep bouncing the whole time it's on
// screen (that's the point of this mark), then a clean fade to login.
const LOGO_IN = 550;
const HOLD = 5500;
const FADE_OUT = 500;
const TOTAL = LOGO_IN + HOLD + FADE_OUT;

export default function SplashScreen({ onDone }) {
  const [phase, setPhase] = useState("in"); // in -> hold -> leaving

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("hold"), LOGO_IN);
    const t2 = setTimeout(() => setPhase("leaving"), LOGO_IN + HOLD);
    const t3 = setTimeout(() => onDone?.(), TOTAL);
    return () => [t1, t2, t3].forEach(clearTimeout);
  }, [onDone]);

  return (
    <div className={`splash-screen ${phase === "leaving" ? "leaving" : ""}`}>
      <div className="splash-mark">
        <Logo size={84} />
        <div className={`splash-wordmark ${phase !== "in" ? "settled" : ""}`}>Yapp</div>
      </div>
      <span className="splash-caption">someone's always yapping</span>
    </div>
  );
}
