import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { useAudioRecorder } from "../hooks/useAudioRecorder";
import { strings, categoryLabel } from "../i18n/strings";

const CATEGORY_ICONS = {
  "Food & Drink": "🍽️", Transport: "🚗", Shopping: "🛍️",
  Bills: "💡", Entertainment: "🎬", Health: "💊", Education: "📚", Other: "📦",
};

const CATEGORY_LIST = Object.keys(CATEGORY_ICONS);

export default function Dashboard() {
  const { user, logout, refreshUser } = useAuth();
  const { isRecording, audioBlob, error: micError, startRecording, stopRecording } = useAudioRecorder();
  const [status, setStatus] = useState("idle");
  const [pending, setPending] = useState(null); // { transcription, expense, lang } — awaiting confirm
  const [result, setResult] = useState(null);   // last confirmed/failed result, for display
  const [history, setHistory] = useState([]);
  const [textInput, setTextInput] = useState("");
  const [activeTab, setActiveTab] = useState("voice");
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState(null);
  const [historyWarning, setHistoryWarning] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const processingRef = useRef(false);

  // Language preference — defaults to whatever the backend has saved for
  // this user, falls back to English. Persisted via PATCH /auth/language.
  const [lang, setLang] = useState(user?.language || "en");
  const t = strings[lang];

  useEffect(() => {
    if (user?.language) setLang(user.language);
  }, [user?.language]);

  // Fetch analytics the first time the Summary tab is opened, and again any
  // time a new expense is confirmed/edited/deleted while it's the active tab
  // (those actions already call refreshUser(); this keeps Summary in sync
  // with them without a separate polling loop).
  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    setAnalyticsError(null);
    try {
      const res = await axios.get("/api/expenses/analytics");
      setAnalytics(res.data.analytics);
    } catch (err) {
      setAnalyticsError(err.response?.data?.error || "Could not load summary.");
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "summary") fetchAnalytics();
  }, [activeTab]);

  // Call after any action that changes expense data, so Summary stays
  // current even if the user doesn't leave and re-open that tab.
  const refreshUserAndAnalytics = () => {
    refreshUser();
    if (activeTab === "summary") fetchAnalytics();
  };

  useEffect(() => {
    if (audioBlob && !processingRef.current) {
      processingRef.current = true;
      sendAudio(audioBlob).finally(() => { processingRef.current = false; });
    }
  }, [audioBlob]);

  const changeLanguage = async (newLang) => {
    setLang(newLang);
    try {
      await axios.patch("/auth/language", { language: newLang });
      refreshUser();
    } catch {
      // Non-fatal — UI still switches locally even if the save fails;
      // it'll just retry from the user's default next time they toggle.
    }
  };

  // ── Voice: record → preview (no save yet) ──────────────────────────────
  const sendAudio = async (blob) => {
    setStatus("processing");
    setResult(null);
    setPending(null);
    const formData = new FormData();
    formData.append("audio", blob, "recording.webm");
    formData.append("lang", lang);
    try {
      const res = await axios.post("/api/expenses/audio/preview", formData);
      handlePreview(res.data);
    } catch (err) {
      setStatus("error");
      setResult({ error: err.response?.data?.error || "Server error" });
    }
  };

  // ── Text: type → preview (no save yet) ──────────────────────────────────
  const sendText = async () => {
    if (!textInput.trim()) return;
    setStatus("processing");
    setResult(null);
    setPending(null);
    try {
      const res = await axios.post("/api/expenses/text/preview", { text: textInput, lang });
      handlePreview(res.data);
      setTextInput("");
    } catch (err) {
      setStatus("error");
      setResult({ error: err.response?.data?.error || "Server error" });
    }
  };

  const handlePreview = (data) => {
    if (data.success && data.expense) {
      setPending({ transcription: data.transcription, expense: data.expense, lang: data.lang || lang });
      setStatus("confirming");
    } else {
      setStatus("error");
      setResult({ error: data.message || "Could not detect an expense.", transcription: data.transcription });
    }
  };

  // ── User reviewed the preview — actually save now ───────────────────────
  const confirmPending = async () => {
    if (!pending) return;
    setStatus("processing");
    try {
      const res = await axios.post("/api/expenses/confirm", {
        expense: pending.expense,
        transcription: pending.transcription,
        lang: pending.lang,
      });
      setResult({ success: true, expense: res.data.expense, transcription: pending.transcription });
      setStatus("success");
      setHistory((prev) => [
        { ...res.data.expense, transcription: pending.transcription, id: res.data.expense._id || Date.now() },
        ...prev.slice(0, 19),
      ]);
      setPending(null);
      refreshUserAndAnalytics();
    } catch (err) {
      setStatus("error");
      setResult({ error: err.response?.data?.error || "Server error" });
    }
  };

  const discardPending = () => {
    setPending(null);
    setStatus("idle");
    setResult(null);
  };

  const updatePendingField = (field, value) => {
    setPending((prev) => ({ ...prev, expense: { ...prev.expense, [field]: value } }));
  };

  // ── History: edit / delete ──────────────────────────────────────────────
  const startEdit = (item) => {
    setEditingId(item.id);
    setEditDraft({ item: item.item, category: item.category, amount: item.amount, date: item.date });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft(null);
  };

  const saveEdit = async (id) => {
    try {
      const res = await axios.patch(`/api/expenses/${id}`, editDraft);
      setHistory((prev) => prev.map((h) => (h.id === id ? { ...h, ...res.data.expense } : h)));
      refreshUserAndAnalytics();
    } catch (err) {
      console.error("Edit failed:", err.response?.data?.error || err.message);
    } finally {
      cancelEdit();
    }
  };

  const deleteExpense = async (id) => {
    if (!window.confirm(t.confirmDelete)) return;
    try {
      const res = await axios.delete(`/api/expenses/${id}`);
      setHistory((prev) => prev.filter((h) => h.id !== id));
      refreshUserAndAnalytics();
      // Non-fatal — the expense is gone from the app, but the Sheet row
      // delete failed (e.g. transient API error). Let the user know so
      // they're not confused later by a stale row in their spreadsheet.
      setHistoryWarning(res.data.sheetWarning || null);
    } catch (err) {
      console.error("Delete failed:", err.response?.data?.error || err.message);
    }
  };

  const handleMicClick = () => {
    if (isRecording) {
      stopRecording();
      setStatus("processing");
    } else {
      if (status === "processing" || status === "confirming") return;
      startRecording();
      setStatus("recording");
      setResult(null);
      setPending(null);
    }
  };

  const getMicLabel = () => {
    if (status === "processing") return t.micProcessing;
    if (isRecording) return t.micRecording;
    if (status === "success") return t.micSuccess;
    return t.micIdle;
  };

  return (
    <div style={s.app}>
      {/* Header */}
      <header style={s.header}>
        <div style={s.headerLeft}>
          <span style={{ fontSize: 24 }}>🎙️</span>
          <div>
            <div style={s.appName}>{t.appName}</div>
            <div style={s.userEmail}>{user?.email}</div>
          </div>
        </div>
        <div style={s.headerRight}>
          <LanguageToggle lang={lang} onChange={changeLanguage} />
          {user?.sheetUrl && (
            <a href={user.sheetUrl} target="_blank" rel="noreferrer" style={s.sheetBtn}>
              📊 {t.openSheet}
            </a>
          )}
          <button onClick={() => setSettingsOpen(true)} style={s.iconBtn} aria-label={t.settingsTitle}>
            ⚙️
          </button>
          <button onClick={logout} style={s.logoutBtn}>{t.signOut}</button>
        </div>
      </header>

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        user={user}
        t={t}
        refreshUser={refreshUser}
      />

      {/* Stats bar */}
      <div style={s.statsBar}>
        <div style={s.stat}>
          <div style={s.statNum}>{user?.totalExpenses || 0}</div>
          <div style={s.statLabel}>{t.totalLogged}</div>
        </div>
        <div style={s.statDivider} />
        <div style={s.stat}>
          <div style={s.statNum}>₹{(user?.totalAmount || 0).toLocaleString("en-IN")}</div>
          <div style={s.statLabel}>{t.totalSpent}</div>
        </div>
        <div style={s.statDivider} />
        <div style={s.stat}>
          <div style={{ ...s.statNum, fontSize: 12, color: "#00d4aa" }}>✅ {t.autoSynced}</div>
          <div style={s.statLabel}>{t.googleSheets}</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={s.tabs}>
        {["voice", "text", "summary", "history"].map((tab) => (
          <button
            key={tab}
            style={{ ...s.tab, ...(activeTab === tab ? s.tabActive : {}) }}
            onClick={() => setActiveTab(tab)}
          >
            {tab === "voice"
              ? `🎤 ${t.voiceTab}`
              : tab === "text"
              ? `⌨️ ${t.textTab}`
              : tab === "summary"
              ? `📊 ${t.summaryTab}`
              : `📋 ${t.historyTab}${history.length ? ` (${history.length})` : ""}`}
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

              {isRecording && (
                <div style={s.recordingBadge}>
                  <span style={s.recordingDot} /> RECORDING
                </div>
              )}

              {!pending && (
                <div style={s.exampleBox}>
                  <div style={s.exampleTitle}>{t.tryString}</div>
                  {t.examples.map((ex) => (
                    <div key={ex} style={s.exampleLine}>"{ex}"</div>
                  ))}
                </div>
              )}
            </div>

            {micError && <div style={s.alertError}>{micError}</div>}
            {pending ? (
              <ConfirmCard
                pending={pending}
                t={t}
                lang={lang}
                onFieldChange={updatePendingField}
                onConfirm={confirmPending}
                onDiscard={discardPending}
                isSaving={status === "processing"}
              />
            ) : (
              <ResultCard result={result} status={status} t={t} lang={lang} />
            )}
          </div>
        )}

        {/* Text Tab */}
        {activeTab === "text" && (
          <div style={s.tabContent}>
            <textarea
              style={s.textarea}
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={t.textPlaceholder}
              rows={4}
              onKeyDown={(e) => e.key === "Enter" && e.ctrlKey && sendText()}
            />
            <button
              style={{ ...s.submitBtn, opacity: (!textInput.trim() || status === "processing") ? 0.5 : 1 }}
              onClick={sendText}
              disabled={!textInput.trim() || status === "processing"}
            >
              {status === "processing" ? t.processing : t.logExpense}
            </button>
            {pending ? (
              <ConfirmCard
                pending={pending}
                t={t}
                lang={lang}
                onFieldChange={updatePendingField}
                onConfirm={confirmPending}
                onDiscard={discardPending}
                isSaving={status === "processing"}
              />
            ) : (
              <ResultCard result={result} status={status} t={t} lang={lang} />
            )}
          </div>
        )}

        {/* Summary Tab */}
        {activeTab === "summary" && (
          <div style={s.tabContent}>
            <SummaryView
              analytics={analytics}
              loading={analyticsLoading}
              error={analyticsError}
              onRetry={fetchAnalytics}
              t={t}
              lang={lang}
            />
          </div>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
          <div style={s.tabContent}>
            {historyWarning && (
              <div style={s.alertWarning}>
                ⚠️ {historyWarning}
                <button style={s.dismissBtn} onClick={() => setHistoryWarning(null)}>✕</button>
              </div>
            )}
            {history.length === 0 ? (
              <div style={s.empty}>
                <div style={{ fontSize: 48 }}>📭</div>
                <p>{t.noHistory}</p>
              </div>
            ) : (
              history.map((item) => (
                <HistoryRow
                  key={item.id}
                  item={item}
                  t={t}
                  lang={lang}
                  isEditing={editingId === item.id}
                  editDraft={editDraft}
                  onStartEdit={() => startEdit(item)}
                  onCancelEdit={cancelEdit}
                  onSaveEdit={() => saveEdit(item.id)}
                  onDelete={() => deleteExpense(item.id)}
                  onDraftChange={(field, value) => setEditDraft((d) => ({ ...d, [field]: value }))}
                />
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

// ─── Language toggle ──────────────────────────────────────────────────────────
function LanguageToggle({ lang, onChange }) {
  return (
    <div style={s.langToggle}>
      <button
        style={{ ...s.langBtn, ...(lang === "en" ? s.langBtnActive : {}) }}
        onClick={() => onChange("en")}
      >
        EN
      </button>
      <button
        style={{ ...s.langBtn, ...(lang === "ta" ? s.langBtnActive : {}) }}
        onClick={() => onChange("ta")}
      >
        த
      </button>
    </div>
  );
}

// ─── Confirm card — shown after preview, before anything is saved ───────────
function ConfirmCard({ pending, t, lang, onFieldChange, onConfirm, onDiscard, isSaving }) {
  const { transcription, expense } = pending;

  return (
    <div style={s.confirmCard}>
      <div style={s.confirmHeading}>{t.confirmHeading}</div>
      <div style={s.confirmHint}>{t.confirmHint}</div>

      {transcription && (
        <div style={s.transcriptBox}>"{transcription}"</div>
      )}

      <div style={s.editGrid}>
        <label style={s.editLabel}>
          {t.itemLabel}
          <input
            style={s.editInput}
            value={expense.item}
            onChange={(e) => onFieldChange("item", e.target.value)}
          />
        </label>
        <label style={s.editLabel}>
          {t.amountLabel}
          <input
            style={s.editInput}
            type="number"
            value={expense.amount}
            onChange={(e) => onFieldChange("amount", e.target.value)}
          />
        </label>
        <label style={s.editLabel}>
          {t.categoryLabel}
          <select
            style={s.editInput}
            value={expense.category}
            onChange={(e) => onFieldChange("category", e.target.value)}
          >
            {CATEGORY_LIST.map((c) => (
              <option key={c} value={c}>{categoryLabel(c, lang)}</option>
            ))}
          </select>
        </label>
        <label style={s.editLabel}>
          {t.dateLabel}
          <input
            style={s.editInput}
            value={expense.date}
            onChange={(e) => onFieldChange("date", e.target.value)}
          />
        </label>
      </div>

      <div style={s.confirmActions}>
        <button style={s.discardBtn} onClick={onDiscard} disabled={isSaving}>{t.discardBtn}</button>
        <button style={s.confirmBtn} onClick={onConfirm} disabled={isSaving}>
          {isSaving ? t.processing : t.confirmBtn}
        </button>
      </div>
    </div>
  );
}

// ─── Result card — shown after a confirmed save, or a parse failure ─────────
function ResultCard({ result, status, t, lang }) {
  if (!result) return null;
  const isError = status === "error" || !result.success;

  return (
    <div style={{ ...s.resultCard, ...(isError ? s.resultError : s.resultSuccess) }}>
      <div style={{ fontSize: 24 }}>{isError ? "❌" : "✅"}</div>
      <div>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>
          {isError ? t.notDetected : t.savedToSheets}
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
              { label: categoryLabel(result.expense.category, lang), color: "#ffc857", bg: "rgba(255,200,87,0.15)" },
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

// ─── Summary view — pulls together the analytics endpoint into one tab ──────
// Mirrors the shape buildAnalytics() returns on the backend:
// { summary, daily, weekly, monthly, categories, topItems, recentExpenses }
function SummaryView({ analytics, loading, error, onRetry, t, lang }) {
  if (loading) {
    return (
      <div style={s.empty}>
        <span style={s.spinner} />
        <p>{t.summaryLoading}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={s.empty}>
        <div style={{ fontSize: 40 }}>⚠️</div>
        <p>{error}</p>
        <button style={s.discardBtn} onClick={onRetry}>{t.summaryRetry}</button>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div style={s.empty}>
        <div style={{ fontSize: 48 }}>📊</div>
        <p>{t.summaryEmpty}</p>
      </div>
    );
  }

  const { summary, categories, topItems, monthly } = analytics;
  const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
  const maxCategoryTotal = categories.length ? Math.max(...categories.map((c) => c.total)) : 0;

  return (
    <>
      {/* Quick totals grid */}
      <div style={s.summaryGrid}>
        {[
          { label: t.summaryToday, value: summary.todayTotal, sub: `${summary.todayCount} ${t.transactions}` },
          { label: t.summaryMonth, value: summary.thisMonthTotal, sub: `${summary.thisMonthCount} ${t.transactions}` },
          { label: t.summaryAllTime, value: summary.totalAmount, sub: `${summary.totalCount} ${t.transactions}` },
          { label: t.summaryAvgDay, value: summary.avgPerDay, sub: t.summaryAvgTxn + ": " + fmt(summary.avgPerTransaction) },
        ].map((card) => (
          <div key={card.label} style={s.summaryCard}>
            <div style={s.summaryCardLabel}>{card.label}</div>
            <div style={s.summaryCardValue}>{fmt(card.value)}</div>
            <div style={s.summaryCardSub}>{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Highest spending day */}
      {summary.highestDay && (
        <div style={s.highestDayBanner}>
          <span>🔥 {t.summaryHighestDay}</span>
          <span style={{ fontWeight: 700 }}>{summary.highestDay.date} — {fmt(summary.highestDay.total)}</span>
        </div>
      )}

      {/* Category breakdown */}
      {categories.length > 0 && (
        <div style={s.summarySection}>
          <div style={s.summarySectionTitle}>{t.summaryByCategory}</div>
          {categories.map((c) => (
            <div key={c.name} style={s.categoryRow}>
              <div style={s.categoryRowTop}>
                <span>{CATEGORY_ICONS[c.name] || "📦"} {categoryLabel(c.name, lang)}</span>
                <span style={{ fontWeight: 600 }}>{fmt(c.total)}</span>
              </div>
              <div style={s.categoryBarTrack}>
                <div
                  style={{
                    ...s.categoryBarFill,
                    width: maxCategoryTotal ? `${Math.max(4, (c.total / maxCategoryTotal) * 100)}%` : "0%",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Top items */}
      {topItems.length > 0 && (
        <div style={s.summarySection}>
          <div style={s.summarySectionTitle}>{t.summaryTopItems}</div>
          {topItems.map((item) => (
            <div key={item.item} style={s.topItemRow}>
              <span>{item.item}</span>
              <span style={{ color: "#6b6b8a", fontSize: 12 }}>{item.count}x</span>
              <span style={{ fontWeight: 600, color: "#00d4aa" }}>{fmt(item.total)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Monthly history */}
      {monthly.length > 0 && (
        <div style={s.summarySection}>
          <div style={s.summarySectionTitle}>{t.summaryByMonth}</div>
          {monthly.map((m) => (
            <div key={m.key} style={s.topItemRow}>
              <span>{m.label}</span>
              <span style={{ color: "#6b6b8a", fontSize: 12 }}>{m.count} {t.transactions}</span>
              <span style={{ fontWeight: 600 }}>{fmt(m.total)}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ─── Settings panel — WhatsApp number + reminder/summary toggles ───────────
// A slide-in drawer rather than a tab, since this is account configuration
// the user visits occasionally, not a content view they switch between.
function SettingsPanel({ open, onClose, user, t, refreshUser }) {
  const [number, setNumber] = useState(user?.whatsappNumber || "");
  const [remindersEnabled, setRemindersEnabled] = useState(user?.remindersEnabled ?? true);
  const [summaryEnabled, setSummaryEnabled] = useState(user?.summaryEnabled ?? true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saved, setSaved] = useState(false);

  // Re-sync local form state whenever the panel is (re)opened, so it always
  // reflects the latest saved values rather than stale state from before.
  useEffect(() => {
    if (open) {
      setNumber(user?.whatsappNumber || "");
      setRemindersEnabled(user?.remindersEnabled ?? true);
      setSummaryEnabled(user?.summaryEnabled ?? true);
      setSaveError(null);
      setSaved(false);
    }
  }, [open, user]);

  if (!open) return null;

  const digitsOnly = number.replace(/\D/g, "");
  const isValid = digitsOnly.length === 0 || (digitsOnly.length >= 10 && digitsOnly.length <= 15);

  const handleSave = async () => {
    if (!isValid) return;
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      await axios.patch("/auth/whatsapp", {
        whatsappNumber: digitsOnly || null,
        remindersEnabled,
        summaryEnabled,
      });
      refreshUser();
      setSaved(true);
    } catch (err) {
      setSaveError(err.response?.data?.error || "Could not save settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div style={s.drawerOverlay} onClick={onClose} />
      <div style={s.drawer}>
        <div style={s.drawerHeader}>
          <div style={s.drawerTitle}>⚙️ {t.settingsTitle}</div>
          <button style={s.drawerCloseBtn} onClick={onClose} aria-label={t.cancelBtn}>✕</button>
        </div>

        <div style={s.drawerBody}>
          <div style={s.settingsSection}>
            <label style={s.editLabel}>
              {t.whatsappLabel}
              <input
                style={s.editInput}
                type="tel"
                inputMode="numeric"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder={t.whatsappPlaceholder}
              />
            </label>
            <div style={s.settingsHint}>{t.whatsappHint}</div>
            {!isValid && <div style={{ ...s.settingsHint, color: "#ff8fa3" }}>{t.whatsappInvalid}</div>}
          </div>

          <div style={s.settingsSection}>
            <ToggleRow
              label={t.remindersToggleLabel}
              hint={t.remindersToggleHint}
              checked={remindersEnabled}
              onChange={setRemindersEnabled}
            />
            <ToggleRow
              label={t.summaryToggleLabel}
              hint={t.summaryToggleHint}
              checked={summaryEnabled}
              onChange={setSummaryEnabled}
            />
          </div>

          {saveError && <div style={s.alertError}>{saveError}</div>}
          {saved && !saveError && (
            <div style={{ ...s.alertWarning, background: "#0d2b1e", borderColor: "rgba(0,212,170,0.3)", color: "#00d4aa" }}>
              ✅ {t.settingsSaved}
            </div>
          )}

          <button
            style={{ ...s.confirmBtn, width: "100%", opacity: saving || !isValid ? 0.6 : 1 }}
            onClick={handleSave}
            disabled={saving || !isValid}
          >
            {saving ? t.processing : t.saveBtn}
          </button>
        </div>
      </div>
    </>
  );
}

function ToggleRow({ label, hint, checked, onChange }) {
  return (
    <div style={s.toggleRow}>
      <div style={{ flex: 1 }}>
        <div style={s.toggleLabel}>{label}</div>
        <div style={s.settingsHint}>{hint}</div>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        style={{ ...s.toggleSwitch, ...(checked ? s.toggleSwitchOn : {}) }}
      >
        <span style={{ ...s.toggleKnob, ...(checked ? s.toggleKnobOn : {}) }} />
      </button>
    </div>
  );
}

// ─── History row — view, edit, or delete a confirmed entry ──────────────────
function HistoryRow({ item, t, lang, isEditing, editDraft, onStartEdit, onCancelEdit, onSaveEdit, onDelete, onDraftChange }) {
  if (isEditing) {
    return (
      <div style={s.historyCard}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          <input
            style={s.editInput}
            value={editDraft.item}
            onChange={(e) => onDraftChange("item", e.target.value)}
            placeholder={t.itemLabel}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <input
              style={{ ...s.editInput, flex: 1 }}
              type="number"
              value={editDraft.amount}
              onChange={(e) => onDraftChange("amount", e.target.value)}
              placeholder={t.amountLabel}
            />
            <select
              style={{ ...s.editInput, flex: 1 }}
              value={editDraft.category}
              onChange={(e) => onDraftChange("category", e.target.value)}
            >
              {CATEGORY_LIST.map((c) => (
                <option key={c} value={c}>{categoryLabel(c, lang)}</option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button style={s.discardBtn} onClick={onCancelEdit}>{t.cancelBtn}</button>
            <button style={s.confirmBtn} onClick={onSaveEdit}>{t.saveBtn}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={s.historyCard}>
      <div style={{ fontSize: 28 }}>{CATEGORY_ICONS[item.category] || "📦"}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 15 }}>{item.item}</div>
        <div style={{ fontSize: 11, color: "#6b6b8a" }}>{categoryLabel(item.category, lang)} • {item.date}</div>
        {item.transcription && (
          <div style={{ fontSize: 11, color: "#6b6b8a", fontStyle: "italic", marginTop: 2 }}>
            "{item.transcription}"
          </div>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
        <div style={{ fontWeight: 700, fontSize: 18, color: "#00d4aa", fontFamily: "monospace" }}>
          ₹{item.amount}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button style={s.rowActionBtn} onClick={onStartEdit}>{t.editBtn}</button>
          <button style={{ ...s.rowActionBtn, color: "#ff8fa3", borderColor: "rgba(255,77,109,0.3)" }} onClick={onDelete}>
            {t.deleteBtn}
          </button>
        </div>
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
  langToggle: { display: "flex", background: "#1c1c28", borderRadius: 8, padding: 2, border: "1px solid #2a2a3d" },
  langBtn: { background: "none", border: "none", color: "#6b6b8a", fontSize: 12, fontWeight: 600, padding: "5px 10px", borderRadius: 6, cursor: "pointer", fontFamily: "'Sora',sans-serif" },
  langBtnActive: { background: "#6c63ff", color: "white" },
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
  alertWarning: { padding: "12px 16px", borderRadius: 12, fontSize: 13, background: "#2b220d", border: "1px solid rgba(255,200,87,0.3)", color: "#ffc857", display: "flex", alignItems: "flex-start", gap: 10, justifyContent: "space-between" },
  dismissBtn: { background: "none", border: "none", color: "#ffc857", cursor: "pointer", fontSize: 13, padding: 0, lineHeight: 1 },
  spinner: { display: "inline-block", width: 20, height: 20, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.6s linear infinite" },

  // ── Confirm card ──────────────────────────────────────────────────────────
  confirmCard: { background: "#13131a", border: "1px solid #6c63ff", borderRadius: 14, padding: "18px 18px 16px", animation: "slideUp 0.3s ease", display: "flex", flexDirection: "column", gap: 12 },
  confirmHeading: { fontWeight: 700, fontSize: 16 },
  confirmHint: { fontSize: 12, color: "#6b6b8a", marginTop: -8 },
  transcriptBox: { fontSize: 12, color: "#a89fff", fontStyle: "italic", background: "#1c1c28", border: "1px solid #2a2a3d", borderRadius: 8, padding: "8px 12px" },
  editGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  editLabel: { display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: "#6b6b8a", textTransform: "uppercase", letterSpacing: 0.5 },
  editInput: { background: "#1c1c28", border: "1px solid #2a2a3d", borderRadius: 8, color: "#e8e8f0", fontFamily: "'Sora',sans-serif", fontSize: 14, padding: "9px 10px", outline: "none" },
  confirmActions: { display: "flex", gap: 10, marginTop: 4 },
  discardBtn: { flex: 1, background: "none", border: "1px solid #2a2a3d", color: "#6b6b8a", borderRadius: 10, padding: "11px 16px", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "'Sora',sans-serif" },
  confirmBtn: { flex: 2, background: "linear-gradient(135deg,#00d4aa,#00b894)", border: "none", color: "#06231c", borderRadius: 10, padding: "11px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'Sora',sans-serif" },

  // ── History row actions ──────────────────────────────────────────────────
  rowActionBtn: { background: "none", border: "1px solid #2a2a3d", color: "#a89fff", borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'Sora',sans-serif" },

  // ── Summary tab ───────────────────────────────────────────────────────────
  summaryGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  summaryCard: { background: "#13131a", border: "1px solid #2a2a3d", borderRadius: 12, padding: "14px 16px" },
  summaryCardLabel: { fontSize: 11, color: "#6b6b8a", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  summaryCardValue: { fontSize: 20, fontWeight: 700, color: "#e8e8f0", fontFamily: "monospace" },
  summaryCardSub: { fontSize: 11, color: "#6b6b8a", marginTop: 4 },
  highestDayBanner: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,140,66,0.08)", border: "1px solid rgba(255,140,66,0.25)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#ffb37a" },
  summarySection: { background: "#13131a", border: "1px solid #2a2a3d", borderRadius: 12, padding: "16px 18px" },
  summarySectionTitle: { fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#a89fff", marginBottom: 12 },
  categoryRow: { marginBottom: 12 },
  categoryRowTop: { display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 },
  categoryBarTrack: { height: 6, background: "#1c1c28", borderRadius: 4, overflow: "hidden" },
  categoryBarFill: { height: "100%", background: "linear-gradient(90deg,#6c63ff,#9b5de5)", borderRadius: 4 },
  topItemRow: { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, padding: "8px 0", borderBottom: "1px solid #1c1c28" },

  // ── Settings drawer ──────────────────────────────────────────────────────
  iconBtn: { fontSize: 14, background: "none", border: "1px solid #2a2a3d", borderRadius: 8, padding: "6px 10px", cursor: "pointer", lineHeight: 1 },
  drawerOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 20 },
  drawer: { position: "fixed", top: 0, right: 0, bottom: 0, width: "min(360px, 100vw)", background: "#13131a", borderLeft: "1px solid #2a2a3d", zIndex: 21, display: "flex", flexDirection: "column", animation: "slideUp 0.25s ease" },
  drawerHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 20px", borderBottom: "1px solid #2a2a3d" },
  drawerTitle: { fontWeight: 700, fontSize: 16 },
  drawerCloseBtn: { background: "none", border: "none", color: "#6b6b8a", fontSize: 16, cursor: "pointer", padding: 4 },
  drawerBody: { padding: 20, display: "flex", flexDirection: "column", gap: 20, overflowY: "auto" },
  settingsSection: { display: "flex", flexDirection: "column", gap: 10 },
  settingsHint: { fontSize: 11, color: "#6b6b8a", lineHeight: 1.5 },
  toggleRow: { display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #1c1c28" },
  toggleLabel: { fontSize: 13, fontWeight: 600, marginBottom: 2 },
  toggleSwitch: { width: 42, height: 24, borderRadius: 12, background: "#2a2a3d", border: "none", cursor: "pointer", position: "relative", flexShrink: 0, padding: 0 },
  toggleSwitchOn: { background: "#00d4aa" },
  toggleKnob: { position: "absolute", top: 3, left: 3, width: 18, height: 18, borderRadius: "50%", background: "#e8e8f0", transition: "left 0.15s ease" },
  toggleKnobOn: { left: 21 },
};
