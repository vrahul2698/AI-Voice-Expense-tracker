import React, { useState } from "react";
import { usePWAInstall } from "../hooks/usePWAInstall";

export default function InstallBanner() {
  const { canInstall, isIOS, triggerInstall } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);

  if (!canInstall || dismissed) return null;

  return (
    <div style={s.banner}>
      <div style={s.left}>
        <span style={{ fontSize: 24 }}>📲</span>
        <div>
          <div style={s.title}>Install VoiceLog</div>
          <div style={s.sub}>
            {isIOS
              ? 'Tap the Share button → "Add to Home Screen"'
              : "Add to home screen for instant access"}
          </div>
        </div>
      </div>
      <div style={s.actions}>
        {!isIOS && (
          <button style={s.installBtn} onClick={triggerInstall}>
            Install
          </button>
        )}
        <button style={s.dismissBtn} onClick={() => setDismissed(true)}>
          ✕
        </button>
      </div>
    </div>
  );
}

const s = {
  banner: {
    background: "linear-gradient(135deg, rgba(108,99,255,0.15), rgba(0,212,170,0.1))",
    border: "1px solid rgba(108,99,255,0.3)",
    borderRadius: 14,
    padding: "14px 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    margin: "12px 16px 0",
    animation: "slideUp 0.4s ease",
  },
  left: { display: "flex", alignItems: "center", gap: 12, flex: 1 },
  title: { fontWeight: 600, fontSize: 14, color: "#e8e8f0" },
  sub: { fontSize: 11, color: "#6b6b8a", marginTop: 2, lineHeight: 1.4 },
  actions: { display: "flex", alignItems: "center", gap: 8, flexShrink: 0 },
  installBtn: {
    background: "linear-gradient(135deg, #6c63ff, #9b5de5)",
    color: "white",
    border: "none",
    borderRadius: 8,
    padding: "7px 16px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  dismissBtn: {
    background: "none",
    border: "none",
    color: "#6b6b8a",
    cursor: "pointer",
    fontSize: 14,
    padding: "4px 8px",
  },
};
