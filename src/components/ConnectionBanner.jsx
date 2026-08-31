import React, { useEffect, useState } from "react";
import { onStatusChange, getStatus } from "../services/socket.js";
import "./ConnectionBanner.css";

export default function ConnectionBanner() {
  const [status, setStatus] = useState(getStatus());
  const [visible, setVisible] = useState(() => getStatus() === "connecting" || getStatus() === "reconnecting");

  useEffect(() => {
    const unsub = onStatusChange((next) => {
      setStatus(next);
      if (next === "reconnecting" || next === "connecting") {
        setVisible(true);
      } else if (next === "connected") {
        setVisible(true);
        setTimeout(() => setVisible(false), 1500);
      } else {
        setVisible(false);
      }
    });
    return unsub;
  }, []);

  if (!visible) return null;

  return (
    <div className={`connection-banner ${status}`}>
      {status === "connecting" && (
        <>
          <span className="conn-spinner" /> Connecting…
        </>
      )}
      {status === "reconnecting" && (
        <>
          <span className="conn-spinner" /> Reconnecting…
        </>
      )}
      {status === "connected" && <>● Connected</>}
    </div>
  );
}
