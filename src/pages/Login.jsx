import React, { useEffect, useRef, useState } from "react";

const PHRASE = "spent 200 on tea";

export default function Login() {
  const canvasRef = useRef(null);
  const [typed, setTyped] = useState("");
  const [showLine, setShowLine] = useState(false);

  // Typewriter effect — the spoken phrase prints itself out, then resolves
  // into a line item, like a register printing a receipt line.
  useEffect(() => {
    let i = 0;
    let timeoutId;

    const type = () => {
      if (i <= PHRASE.length) {
        setTyped(PHRASE.slice(0, i));
        i++;
        timeoutId = setTimeout(type, 65);
      } else {
        setTimeout(() => setShowLine(true), 400);
      }
    };

    const startDelay = setTimeout(type, 800);
    return () => {
      clearTimeout(startDelay);
      clearTimeout(timeoutId);
    };
  }, []);

  // Faint paper-grain dots, drawn once — subtle, not a particle simulation.
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const draw = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const spacing = 26;
      for (let x = 0; x < canvas.width; x += spacing) {
        for (let y = 0; y < canvas.height; y += spacing) {
          const jitter = ((x * 7 + y * 13) % 11) / 11;
          if (jitter > 0.82) {
            ctx.beginPath();
            ctx.arc(x + (jitter * 6 - 3), y + (jitter * 4 - 2), 0.6, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(28,26,23,0.06)";
            ctx.fill();
          }
        }
      }
    };

    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, []);

  const handleGoogleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL}/auth/google`;
  };

  return (
    <div style={s.root}>
      <canvas ref={canvasRef} style={s.canvas} />

      <div className="vl-container" style={s.container}>
        {/* Left — masthead */}
        <div className="vl-left" style={s.left}>
          <div className="vl-eyebrow" style={s.eyebrow}>NO TAPS. NO FORMS. JUST TALK.</div>

          <h1 className="vl-headline" style={s.headline}>
            Speak.<br />We handle<br />the rest.
          </h1>

          <p className="vl-subtext" style={s.subtext}>
            Say "spent 200 on tea" and watch it land in your Google Sheet instantly.
            No typing, no apps, no friction.
          </p>

          <div className="vl-typer" style={s.typerBox}>
            <div style={s.typerLabel}>
              <i className="ti ti-microphone" style={{ fontSize: 14, marginRight: 6 }} aria-hidden="true" />
              listening
            </div>
            <div style={s.typerText}>
              "{typed}<span style={s.cursor}>|</span>"
            </div>
            {showLine && (
              <div style={s.resolvedLine}>
                <span>Tea</span>
                <span style={s.dots} />
                <span>Food &amp; Drink</span>
                <span style={s.amount}>₹200</span>
              </div>
            )}
          </div>
        </div>

        {/* Right — receipt stub card */}
        <div className="vl-stub" style={s.stubWrap}>
          <div style={s.perforation} />

          <div className="vl-card" style={s.card}>
            <div style={s.brandRow}>
              <div style={s.brandMark}>VL</div>
              <div>
                <div style={s.brandName}>VoiceLog</div>
                <div style={s.brandBy}>by Rahul</div>
              </div>
            </div>

            <p style={s.cardSub}>A ledger that listens.</p>

            <div style={s.featureList}>
              {[
                { icon: "ti-bolt", text: "Talk at normal speed — it keeps up" },
                { icon: "ti-brain", text: "No forms, no dropdowns — it just understands" },
                { icon: "ti-table", text: "Lands in your own sheet, not ours" },
                { icon: "ti-lock", text: "One tap in. Nothing to remember" },
              ].map((f) => (
                <div key={f.text} style={s.feature}>
                  <i className={`ti ${f.icon}`} style={s.featureIcon} aria-hidden="true" />
                  <span style={s.featureText}>{f.text}</span>
                </div>
              ))}
            </div>

            <button
              style={s.googleBtn}
              onClick={handleGoogleLogin}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-1px)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            <p style={s.disclaimer}>
              We only access Google Sheets on your behalf.<br />
              Your data stays in your own Google account.
            </p>
          </div>

          <div style={s.serration} />
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;1,9..144,500&family=Inter:wght@400;500&family=Space+Mono:wght@400;700&display=swap');

        * { box-sizing: border-box; }
        html, body, #root {
          overflow-x: hidden;
          width: 100%;
        }

        @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0; } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(-6px); } to { opacity: 1; transform: translateX(0); } }

        .vl-resolved { animation: slideIn 0.35s ease forwards; }

        @media (max-width: 900px) {
          .vl-container {
            flex-direction: column !important;
            gap: 36px !important;
            padding: 32px 20px 56px !important;
          }
          .vl-left { align-items: flex-start !important; }
          .vl-stub { width: 100% !important; }
          .vl-card { width: 100% !important; box-sizing: border-box; }
        }

        @media (max-width: 480px) {
          .vl-headline { font-size: 42px !important; line-height: 1.08 !important; }
          .vl-eyebrow { font-size: 10px !important; }
          .vl-typer { padding: 14px !important; }
        }
      `}</style>
    </div>
  );
}

const ink = "#1C1A17";
const inkFaded = "#6B6356";
const paper = "#F7F2E9";
const stamp = "#8A5A44";
const ledgerGreen = "#2D6E5C";
const lineColor = "#D8CFBC";

const s = {
  root: {
    minHeight: "100vh",
    width: "100%",
    background: paper,
    fontFamily: "'Inter', sans-serif",
    position: "relative",
    overflowX: "hidden",
    overflowY: "auto",
  },
  canvas: { position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 },
  container: {
    position: "relative",
    zIndex: 1,
    display: "flex",
    alignItems: "center",
    gap: 72,
    maxWidth: 1080,
    width: "100%",
    margin: "0 auto",
    minHeight: "100vh",
    padding: "64px 40px",
    animation: "fadeUp 0.6s ease forwards",
  },
  left: { flex: 1, display: "flex", flexDirection: "column", gap: 20, minWidth: 0 },
  eyebrow: {
    display: "inline-flex",
    fontFamily: "'Space Mono', monospace",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 1.5,
    color: stamp,
    border: `1px solid ${stamp}`,
    padding: "5px 12px",
    borderRadius: 3,
    width: "fit-content",
  },
  headline: {
    fontFamily: "'Fraunces', serif",
    fontWeight: 500,
    fontSize: "clamp(40px, 6vw, 64px)",
    lineHeight: 1.08,
    color: ink,
    margin: 0,
  },
  subtext: {
    fontSize: 16,
    color: inkFaded,
    lineHeight: 1.7,
    maxWidth: 420,
    margin: 0,
  },
  typerBox: {
    background: "#FFFDF8",
    border: `1px solid ${lineColor}`,
    borderRadius: 6,
    padding: "16px 18px",
    maxWidth: 420,
    marginTop: 8,
  },
  typerLabel: {
    fontFamily: "'Space Mono', monospace",
    fontSize: 11,
    letterSpacing: 1,
    color: inkFaded,
    textTransform: "uppercase",
    marginBottom: 8,
    display: "flex",
    alignItems: "center",
  },
  typerText: {
    fontFamily: "'Space Mono', monospace",
    fontSize: 15,
    color: ink,
    minHeight: 22,
  },
  cursor: {
    animation: "blink 1s step-end infinite",
  },
  resolvedLine: {
    marginTop: 10,
    paddingTop: 10,
    borderTop: `1px dashed ${lineColor}`,
    display: "flex",
    alignItems: "center",
    fontFamily: "'Space Mono', monospace",
    fontSize: 13,
    color: ink,
  },
  dots: {
    flex: 1,
    borderBottom: `1px dotted ${lineColor}`,
    margin: "0 8px",
    transform: "translateY(-4px)",
  },
  amount: { color: ledgerGreen, fontWeight: 700 },
  stubWrap: { position: "relative", width: 420, flexShrink: 0 },
  perforation: {
    height: 0,
    borderTop: `2px dashed ${lineColor}`,
    margin: "0 8px -1px 8px",
  },
  card: {
    position: "relative",
    background: "#FFFDF8",
    border: `1px solid ${lineColor}`,
    borderRadius: "4px 4px 0 0",
    padding: "36px 32px 32px",
    boxShadow: "0 1px 0 rgba(28,26,23,0.04)",
  },
  serration: {
    height: 14,
    margin: "0 8px",
    background:
      "repeating-linear-gradient(115deg, transparent 0 6px, #FFFDF8 6px 12px)",
    borderLeft: `1px solid ${lineColor}`,
    borderRight: `1px solid ${lineColor}`,
  },
  brandRow: { display: "flex", alignItems: "center", gap: 12, marginBottom: 18 },
  brandMark: {
    width: 40,
    height: 40,
    borderRadius: 4,
    background: ink,
    color: paper,
    fontFamily: "'Space Mono', monospace",
    fontWeight: 700,
    fontSize: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  brandName: {
    fontFamily: "'Fraunces', serif",
    fontWeight: 500,
    fontSize: 22,
    color: ink,
    lineHeight: 1.1,
  },
  brandBy: {
    fontFamily: "'Space Mono', monospace",
    fontSize: 12,
    color: inkFaded,
    letterSpacing: 0.5,
  },
  cardSub: { fontSize: 14, color: inkFaded, margin: "0 0 22px", lineHeight: 1.5 },
  featureList: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 26 },
  feature: {
    display: "flex",
    alignItems: "center",
    gap: 11,
    padding: "10px 12px",
    background: paper,
    border: `1px solid ${lineColor}`,
    borderRadius: 4,
  },
  featureIcon: { fontSize: 15, color: stamp, flexShrink: 0 },
  featureText: { fontSize: 13, color: ink, lineHeight: 1.4 },
  googleBtn: {
    width: "100%",
    padding: "13px 20px",
    background: ink,
    color: paper,
    border: "none",
    borderRadius: 4,
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    fontFamily: "'Inter', sans-serif",
    marginBottom: 14,
    transition: "transform 0.15s ease",
  },
  disclaimer: { fontSize: 11, color: inkFaded, lineHeight: 1.6, textAlign: "center", margin: 0 },
};
