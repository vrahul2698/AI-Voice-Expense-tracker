import React, { useEffect, useRef } from "react";

export default function Login() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let animId;
    let particles = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Sound wave particles
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: Math.random() * 1.5 + 0.3,
        dx: (Math.random() - 0.5) * 0.3,
        dy: (Math.random() - 0.5) * 0.3,
        alpha: Math.random() * 0.4 + 0.1,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(139, 92, 246, ${p.alpha})`;
        ctx.fill();
        p.x += p.dx;
        p.y += p.dy;
        if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
      });
      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const handleGoogleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL}/auth/google`;
  };

  return (
    <div style={s.root}>
      <canvas ref={canvasRef} style={s.canvas} />

      {/* Gradient orbs */}
      <div style={s.orb1} />
      <div style={s.orb2} />
      <div style={s.orb3} />

      <div className="vl-container" style={s.container}>
        {/* Left — branding */}
        <div className="vl-left" style={s.left}>
          <div className="vl-badge" style={s.badge}>AI-POWERED EXPENSE TRACKING</div>
          <h1 className="vl-headline" style={s.headline}>
            <span style={s.headlineAccent}>Speak.</span>
            <br />
            We handle
            <br />
            the rest.
          </h1>
          <p className="vl-subtext" style={s.subtext}>
            Say "spent 200 on tea" and watch it land in your Google Sheet instantly. No typing, no apps, no friction.
          </p>

          <div className="vl-wavewrap" style={s.waveWrap}>
            {[...Array(28)].map((_, i) => (
              <div
                key={i}
                style={{
                  ...s.waveBar,
                  height: `${10 + Math.sin(i * 0.7) * 18 + Math.random() * 14}px`,
                  animationDelay: `${i * 0.06}s`,
                  opacity: 0.3 + Math.abs(Math.sin(i * 0.5)) * 0.7,
                }}
              />
            ))}
          </div>
        </div>

        {/* Right — card */}
        <div className="vl-card" style={s.card}>
          <div style={s.cardGlow} />

          <div style={s.iconWrap}>
            <span style={s.icon}>🎙</span>
            <div style={s.iconRing} />
          </div>

          <h2 style={s.cardTitle}>VoiceLog</h2>
          <p style={s.cardSub}>Your personal expense journal, powered by voice.</p>

          <div style={s.featureList}>
            {[
              { icon: "⚡", text: "Instant transcription via Groq Whisper" },
              { icon: "🧠", text: "AI extracts item, amount & category" },
              { icon: "📊", text: "Auto-syncs to your private Google Sheet" },
              { icon: "🔐", text: "Sign in with Google — no passwords" },
            ].map((f) => (
              <div key={f.text} style={s.feature}>
                <span style={s.featureIcon}>{f.icon}</span>
                <span style={s.featureText}>{f.text}</span>
              </div>
            ))}
          </div>

          <button style={s.googleBtn} onClick={handleGoogleLogin}
            onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
            onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}>
            <svg width="20" height="20" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <p style={s.disclaimer}>
            We only access Google Sheets on your behalf.<br />Your data stays in your own Google account.
          </p>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap');
        @keyframes waveAnim {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(1.8); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        @keyframes ringPulse {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* ── Responsive overrides ──────────────────────────────────────── */
        /* Inline styles set the desktop baseline; these rules win on smaller
           screens because a class selector here is loaded after, and we only
           touch the properties that actually break layout on mobile. */

        @media (max-width: 900px) {
          .vl-container {
            flex-direction: column !important;
            gap: 40px !important;
            text-align: center;
          }
          .vl-left {
            align-items: center !important;
          }
          .vl-badge {
            margin: 0 auto;
          }
          .vl-wavewrap {
            justify-content: center;
          }
          .vl-card {
            width: 100% !important;
            max-width: 440px;
            box-sizing: border-box;
          }
        }

        @media (max-width: 480px) {
          .vl-headline {
            font-size: clamp(36px, 11vw, 52px) !important;
            line-height: 1.05 !important;
          }
          .vl-subtext {
            font-size: 14px !important;
            padding: 0 8px;
          }
          .vl-card {
            padding: 32px 24px !important;
            border-radius: 20px !important;
          }
          .vl-wavewrap {
            height: 36px !important;
          }
        }

        /* Prevent any child from forcing horizontal scroll on narrow viewports */
        html, body {
          overflow-x: hidden;
        }
      `}</style>
    </div>
  );
}

const s = {
  root: { minHeight: "100vh", background: "#07070f", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif", overflow: "hidden", position: "relative", padding: "20px" },
  canvas: { position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 },
  orb1: { position: "fixed", top: "-20%", left: "-10%", width: 600, height: 600, background: "radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none", zIndex: 0 },
  orb2: { position: "fixed", bottom: "-20%", right: "-10%", width: 700, height: 700, background: "radial-gradient(circle, rgba(6,182,212,0.1) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none", zIndex: 0 },
  orb3: { position: "fixed", top: "40%", left: "40%", width: 400, height: 400, background: "radial-gradient(circle, rgba(236,72,153,0.07) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none", zIndex: 0 },
  container: { position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 80, maxWidth: 1100, width: "100%", animation: "fadeUp 0.8s ease forwards" },
  left: { flex: 1, display: "flex", flexDirection: "column", gap: 24, minWidth: 0 },
  badge: { display: "inline-flex", alignItems: "center", gap: 8, fontSize: 10, fontWeight: 600, letterSpacing: 2, color: "#8b5cf6", border: "1px solid rgba(139,92,246,0.3)", padding: "6px 14px", borderRadius: 20, width: "fit-content", background: "rgba(139,92,246,0.08)" },
  headline: { fontFamily: "'Instrument Serif', serif", fontSize: "clamp(52px, 6vw, 88px)", lineHeight: 1.0, color: "#f0f0fa", margin: 0, fontWeight: 400 },
  headlineAccent: { fontFamily: "'Instrument Serif', serif", fontStyle: "italic", color: "#a78bfa" },
  subtext: { fontSize: 16, color: "#6b6b8a", lineHeight: 1.7, maxWidth: 420, margin: "0 auto" },
  waveWrap: { display: "flex", alignItems: "center", gap: 3, height: 48, marginTop: 8 },
  waveBar: { width: 3, background: "linear-gradient(to top, #8b5cf6, #06b6d4)", borderRadius: 4, animation: "waveAnim 1.4s ease-in-out infinite", transformOrigin: "bottom" },
  card: { position: "relative", background: "rgba(255,255,255,0.03)", backdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 28, padding: "44px 40px", width: 420, flexShrink: 0, overflow: "hidden" },
  cardGlow: { position: "absolute", top: -60, right: -60, width: 200, height: 200, background: "radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 70%)", pointerEvents: "none" },
  iconWrap: { position: "relative", width: 64, height: 64, marginBottom: 20, animation: "float 3s ease-in-out infinite" },
  icon: { fontSize: 40, position: "relative", zIndex: 1, display: "block", lineHeight: "64px" },
  iconRing: { position: "absolute", inset: -4, borderRadius: "50%", border: "2px solid rgba(139,92,246,0.4)", animation: "ringPulse 2s ease-out infinite" },
  cardTitle: { fontSize: 28, fontFamily: "'Instrument Serif', serif", fontWeight: 400, color: "#f0f0fa", margin: "0 0 6px" },
  cardSub: { fontSize: 14, color: "#6b6b8a", margin: "0 0 28px", lineHeight: 1.5 },
  featureList: { display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 },
  feature: { display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12 },
  featureIcon: { fontSize: 16, flexShrink: 0 },
  featureText: { fontSize: 13, color: "#b0b0cc", lineHeight: 1.4 },
  googleBtn: { width: "100%", padding: "15px 24px", background: "white", border: "none", borderRadius: 14, fontSize: 15, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, fontFamily: "'DM Sans', sans-serif", marginBottom: 16, transition: "transform 0.2s, box-shadow 0.2s", boxShadow: "0 4px 24px rgba(0,0,0,0.3)" },
  disclaimer: { fontSize: 11, color: "#3a3a5a", lineHeight: 1.6, textAlign: "center", margin: 0 },
};
