import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { useAudioRecorder } from "../hooks/useAudioRecorder";

const CATEGORY_ICONS = {
  "Food & Drink": "🍽️", Transport: "🚗", Shopping: "🛍️",
  Bills: "💡", Entertainment: "🎬", Health: "💊", Education: "📚", Other: "📦",
};

export default function Dashboard() {
  const { user, logout, refreshUser } = useAuth();
  const { isRecording, audioBlob, error: micError, startRecording, stopRecording } = useAudioRecorder();
  const [status, setStatus] = useState("idle");
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [textInput, setTextInput] = useState("");
  const [activeTab, setActiveTab] = useState("voice");
  const processingRef = useRef(false);

  useEffect(() => {
    if (audioBlob && !processingRef.current) {
      processingRef.current = true;
      sendAudio(audioBlob).finally(() => { processingRef.current = false; });
    }
  }, [audioBlob]);

  const sendAudio = async (blob) => {
    setStatus("processing");
    setResult(null);
    const formData = new FormData();
    formData.append("audio", blob, "recording.webm");
    try {
      const res = await axios.post("/api/expenses/audio", formData);
      handleSuccess(res.data);
    } catch (err) {
      setStatus("error");
      setResult({ error: err.response?.data?.error || "Server error" });
    }
  };

  const sendText = async () => {
    if (!textInput.trim()) return;
    setStatus("processing");
    setResult(null);
    try {
      const res = await axios.post("/api/expenses/text", { text: textInput });
      handleSuccess(res.data);
      setTextInput("");
    } catch (err) {
      setStatus("error");
      setResult({ error: err.response?.data?.error || "Server error" });
    }
  };

  const handleSuccess = (data) => {
    setResult(data);
    setStatus(data.success ? "success" : "error");
    if (data.success && data.expense) {
      setHistory((prev) => [
        { ...data.expense, transcription: data.transcription, id: Date.now() },
        ...prev.slice(0, 19),
      ]);
      refreshUser();
    }
  };

  // ── Key fix: never disable the button while recording ──
  const handleMicClick = () => {
    if (isRecording) {
      stopRecording();          // stop first
      setStatus("processing");  // then show processing
    } else {
      if (status === "processing") return; // don't start while processing
      startRecording();
      setStatus("recording");
      setResult(null);
    }
  };

  const getMicLabel = () => {
    if (status === "processing") return "Transcribing & extracting...";
    if (isRecording) return "🔴 Recording... tap to stop";
    if (status === "success") return "✅ Done! Tap to record again";
    return "Tap mic to start recording";
  };

  return (
    <div style={s.app}>
      {/* Header */}
      <header style={s.header}>
        <div style={s.headerLeft}>
          <span style={{ fontSize: 24 }}>🎙️</span>
          <div>
            <div style={s.appName}>VoiceLog</div>
            <div style={s.userEmail}>{user?.email}</div>
          </div>
        </div>
        <div style={s.headerRight}>
          {user?.sheetUrl && (
            <a href={user.sheetUrl} target="_blank" rel="noreferrer" style={s.sheetBtn}>
              📊 Open Sheet
            </a>
          )}
          <button onClick={logout} style={s.logoutBtn}>Sign out</button>
        </div>
      </header>

      {/* Stats bar */}
      <div style={s.statsBar}>
        <div style={s.stat}>
          <div style={s.statNum}>{user?.totalExpenses || 0}</div>
          <div style={s.statLabel}>Total Logged</div>
        </div>
        <div style={s.statDivider} />
        <div style={s.stat}>
          <div style={s.statNum}>₹{(user?.totalAmount || 0).toLocaleString("en-IN")}</div>
          <div style={s.statLabel}>Total Spent</div>
        </div>
        <div style={s.statDivider} />
        <div style={s.stat}>
          <div style={{ ...s.statNum, fontSize: 12, color: "#00d4aa" }}>✅ Auto-synced</div>
          <div style={s.statLabel}>Google Sheets</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={s.tabs}>
        {["voice", "text", "history"].map((tab) => (
          <button
            key={tab}
            style={{ ...s.tab, ...(activeTab === tab ? s.tabActive : {}) }}
            onClick={() => setActiveTab(tab)}
          >
            {tab === "voice" ? "🎤 Voice" : tab === "text" ? "⌨️ Text" : `📋 History${history.length ? ` (${history.length})` : ""}`}
          </button>
        ))}
      </div>

      <main style={s.main}>
        {/* Voice Tab */}
        {activeTab === "voice" && (
          <div style={s.tabContent}>
            <div style={s.micSection}>
              <div style={s.micWrap}>
                {isRecording && (
                  <>
                    <div style={s.pulse1} />
                    <div style={s.pulse2} />
                  </>
                )}
                {/* NEVER disabled when recording so stop always works */}
                <button
                  style={{
                    ...s.micBtn,
                    ...(isRecording ? s.micRecording : {}),
                    ...(status === "processing" ? s.micProcessing : {}),
                    cursor: status === "processing" ? "wait" : "pointer",
                  }}
                  onClick={handleMicClick}
                  disabled={false}
                >
                  {status === "processing"
                    ? <span style={s.spinner} />
                    : isRecording
                    ? "⏹"
                    : "🎤"}
                </button>
              </div>

              <p style={s.micLabel}>{getMicLabel()}</p>

              {/* Recording timer indicator */}
              {isRecording && (
                <div style={s.recordingBadge}>
                  <span style={s.recordingDot} /> RECORDING
                </div>
              )}

              <div style={s.exampleBox}>
                <div style={s.exampleTitle}>Try saying:</div>
                {[
                  "Today I spent 200 on tea",
                  "Paid 500 for auto rickshaw",
                  "Bought groceries for 1200",
                ].map((ex) => (
                  <div key={ex} style={s.exampleLine}>"{ex}"</div>
                ))}
              </div>
            </div>

            {micError && <div style={s.alertError}>{micError}</div>}
            <ResultCard result={result} status={status} />
          </div>
        )}

        {/* Text Tab */}
        {activeTab === "text" && (
          <div style={s.tabContent}>
            <textarea
              style={s.textarea}
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="e.g. Today I spent 200 on tea and snacks..."
              rows={4}
              onKeyDown={(e) => e.key === "Enter" && e.ctrlKey && sendText()}
            />
            <button
              style={{ ...s.submitBtn, opacity: (!textInput.trim() || status === "processing") ? 0.5 : 1 }}
              onClick={sendText}
              disabled={!textInput.trim() || status === "processing"}
            >
              {status === "processing" ? "Processing..." : "→ Log Expense"}
            </button>
            <ResultCard result={result} status={status} />
          </div>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
          <div style={s.tabContent}>
            {history.length === 0 ? (
              <div style={s.empty}>
                <div style={{ fontSize: 48 }}>📭</div>
                <p>No expenses logged yet this session</p>
              </div>
            ) : (
              history.map((item) => (
                <div key={item.id} style={s.historyCard}>
                  <div style={{ fontSize: 28 }}>{CATEGORY_ICONS[item.category] || "📦"}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{item.item}</div>
                    <div style={{ fontSize: 11, color: "#6b6b8a" }}>{item.category} • {item.date}</div>
                    <div style={{ fontSize: 11, color: "#6b6b8a", fontStyle: "italic", marginTop: 2 }}>
                      "{item.transcription}"
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 18, color: "#00d4aa", fontFamily: "monospace" }}>
                    ₹{item.amount}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes expand { 0% { transform: scale(0.9); opacity: 0.8; } 100% { transform: scale(1.5); opacity: 0; } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
    </div>
  );
}

function ResultCard({ result, status }) {
  if (!result) return null;
  const isError = status === "error" || !result.success;

  return (
    <div style={{ ...s.resultCard, ...(isError ? s.resultError : s.resultSuccess) }}>
      <div style={{ fontSize: 24 }}>{isError ? "❌" : "✅"}</div>
      <div>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>
          {isError ? "Not detected" : "Logged to Google Sheets!"}
        </div>
        {result.transcription && (
          <div style={{ fontSize: 12, color: "#6b6b8a", fontStyle: "italic", marginBottom: 8 }}>
            "{result.transcription}"
          </div>
        )}
        {result.error && <div style={{ fontSize: 13, color: "#ff8fa3" }}>{result.error}</div>}
        {!isError && result.expense && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
            {[
              { label: `${CATEGORY_ICONS[result.expense.category] || "📦"} ${result.expense.item}`, color: "#a89fff", bg: "rgba(108,99,255,0.15)" },
              { label: `₹${result.expense.amount}`, color: "#00d4aa", bg: "rgba(0,212,170,0.15)" },
              { label: result.expense.category, color: "#ffc857", bg: "rgba(255,200,87,0.15)" },
              { label: `📅 ${result.expense.date}`, color: "#6b6b8a", bg: "#1c1c28" },
            ].map((p) => (
              <span key={p.label} style={{ fontSize: 12, fontWeight: 500, padding: "4px 12px", borderRadius: 20, color: p.color, background: p.bg }}>
                {p.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  app: { maxWidth: 520, margin: "0 auto", minHeight: "100vh", fontFamily: "'Sora', sans-serif", background: "#0a0a0f", color: "#e8e8f0" },
  header: { background: "#13131a", borderBottom: "1px solid #2a2a3d", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 10 },
  headerLeft: { display: "flex", alignItems: "center", gap: 10 },
  appName: { fontWeight: 700, fontSize: 18 },
  userEmail: { fontSize: 11, color: "#6b6b8a" },
  headerRight: { display: "flex", gap: 8, alignItems: "center" },
  sheetBtn: { fontSize: 12, color: "#00d4aa", textDecoration: "none", background: "rgba(0,212,170,0.1)", border: "1px solid rgba(0,212,170,0.3)", padding: "6px 12px", borderRadius: 8 },
  logoutBtn: { fontSize: 12, color: "#6b6b8a", background: "none", border: "1px solid #2a2a3d", borderRadius: 8, padding: "6px 12px", cursor: "pointer"},
  statsBar: { background: "#13131a", borderBottom: "1px solid #2a2a3d", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-around" },
  stat: { textAlign: "center" },
  statNum: { fontWeight: 700, fontSize: 18, color: "#e8e8f0" },
  statLabel: { fontSize: 10, color: "#6b6b8a", marginTop: 2, textTransform: "uppercase", letterSpacing: 0.5 },
  statDivider: { width: 1, height: 32, background: "#2a2a3d" },
  tabs: { display: "flex", background: "#13131a", borderBottom: "1px solid #2a2a3d" },
  tab: { flex: 1, background: "none", border: "none", borderBottom: "2px solid transparent", color: "#6b6b8a", fontFamily: "'Sora',sans-serif", fontSize: 13, fontWeight: 500, padding: "13px 8px", cursor: "pointer" },
  tabActive: { color: "#6c63ff", borderBottomColor: "#6c63ff" },
  main: { flex: 1 },
  tabContent: { padding: "24px 20px", display: "flex", flexDirection: "column", gap: 16 },
  micSection: { display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "20px 0" },
  micWrap: { position: "relative", width: 120, height: 120, display: "flex", alignItems: "center", justifyContent: "center" },
  pulse1: { position: "absolute", inset: -12, borderRadius: "50%", border: "2px solid #ff4d6d", animation: "expand 1.5s ease-out infinite", opacity: 0, pointerEvents: "none" },
  pulse2: { position: "absolute", inset: -12, borderRadius: "50%", border: "2px solid #ff4d6d", animation: "expand 1.5s ease-out 0.7s infinite", opacity: 0, pointerEvents: "none" },
  micBtn: { width: 96, height: 96, borderRadius: "50%", background: "linear-gradient(135deg,#6c63ff,#9b5de5)", border: "none", cursor: "pointer", fontSize: 34, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 30px rgba(108,99,255,0.4)", transition: "transform 0.15s", userSelect: "none", WebkitUserSelect: "none", position: "relative", zIndex: 2 },
  micRecording: { background: "linear-gradient(135deg,#ff4d6d,#ff8c42)", boxShadow: "0 0 40px rgba(255,77,109,0.6)" },
  micProcessing: { opacity: 0.7 },
  micLabel: { fontSize: 14, color: "#6b6b8a", textAlign: "center" },
  recordingBadge: { display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: "#ff4d6d", background: "rgba(255,77,109,0.1)", border: "1px solid rgba(255,77,109,0.3)", padding: "5px 14px", borderRadius: 20 },
  recordingDot: { width: 7, height: 7, borderRadius: "50%", background: "#ff4d6d", display: "inline-block", animation: "blink 1s ease-in-out infinite" },
  exampleBox: { background: "#13131a", border: "1px solid #2a2a3d", borderRadius: 12, padding: "14px 18px", width: "100%" },
  exampleTitle: { fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: "#6b6b8a", marginBottom: 8 },
  exampleLine: { fontSize: 12, color: "#00d4aa", padding: "3px 0 3px 10px", borderLeft: "2px solid #00d4aa", margin: "4px 0", fontFamily: "monospace" },
  textarea: { background: "#13131a", border: "1px solid #2a2a3d", borderRadius: 12, color: "#e8e8f0", fontFamily: "'Sora',sans-serif", fontSize: 14, padding: "14px 16px", resize: "none", outline: "none", width: "100%", boxSizing: "border-box" },
  submitBtn: { background: "linear-gradient(135deg,#6c63ff,#9b5de5)", color: "white", border: "none", borderRadius: 12, fontFamily: "'Sora',sans-serif", fontSize: 14, fontWeight: 600, padding: "14px 24px", cursor: "pointer" },
  resultCard: { borderRadius: 12, padding: "16px 18px", display: "flex", gap: 12, alignItems: "flex-start", animation: "slideUp 0.3s ease" },
  resultSuccess: { background: "#0d2b1e", border: "1px solid rgba(0,212,170,0.3)" },
  resultError: { background: "#2b0d14", border: "1px solid rgba(255,77,109,0.3)" },
  historyCard: { background: "#13131a", border: "1px solid #2a2a3d", borderRadius: 12, padding: 14, display: "flex", alignItems: "center", gap: 12 },
  empty: { textAlign: "center", padding: "60px 20px", color: "#6b6b8a", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 },
  alertError: { padding: "12px 16px", borderRadius: 12, fontSize: 13, background: "#2b0d14", border: "1px solid rgba(255,77,109,0.3)", color: "#ff8fa3" },
  spinner: { display: "inline-block", width: 20, height: 20, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.6s linear infinite" },
};
