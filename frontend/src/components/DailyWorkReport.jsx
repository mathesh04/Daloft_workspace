import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api/api";

export default function DailyWorkReport() {
  const { user } = useAuth();
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [tasksCompleted, setTasksCompleted] = useState("");
  const [blockers, setBlockers] = useState("None");
  const [planForTomorrow, setPlanForTomorrow] = useState("");
  const [equipmentsUsed, setEquipmentsUsed] = useState("");

  const [history, setHistory] = useState([]);
  const [todayReport, setTodayReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [hist, today] = await Promise.all([
        api.myDailyReports(),
        api.myDailyReportToday()
      ]);
      setHistory(Array.isArray(hist) ? hist : []);
      setTodayReport(today || null);
    } catch (err) {
      setError(err.message || "Failed to load work report history");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!tasksCompleted.trim()) {
      setError("Please describe the tasks completed or today's learnings.");
      return;
    }
    if (!planForTomorrow.trim()) {
      setError("Please describe your plan for tomorrow.");
      return;
    }

    setSubmitting(true);
    try {
      await api.submitDailyReport({
        reportDate,
        tasksCompleted: tasksCompleted.trim(),
        blockers: blockers.trim() || "None",
        planForTomorrow: planForTomorrow.trim(),
        equipmentsUsed: equipmentsUsed.trim() || "N/A",
      });
      setMessage("Your daily work report has been successfully submitted!");
      setTasksCompleted("");
      setBlockers("None");
      setPlanForTomorrow("");
      setEquipmentsUsed("");
      loadData();
    } catch (err) {
      setError(err.message || "Failed to submit daily work report.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="daily-report-workspace" style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
      {/* Header Banner */}
      <div className="premium-card" style={{ background: "linear-gradient(135deg, #102d22, #18523c)", color: "#fff", padding: "24px 28px" }}>
        <span className="eyebrow green" style={{ color: "#7ce3a7", fontSize: "11px" }}>DAILY WORK LOG</span>
        <h2 style={{ color: "#fff", margin: "6px 0 8px", fontSize: "24px" }}>Daily Work Report Submission</h2>
        <p style={{ color: "#a8cfbd", margin: 0, fontSize: "12px", maxWidth: "680px" }}>
          Log your completed tasks, daily learnings, blockers, and plan for tomorrow. Reports are immediately logged to HR & Operations for daily review.
        </p>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {message && <div className="success-banner">{message}</div>}

      {/* Today's Status Banner */}
      {todayReport ? (
        <div className="premium-card" style={{ borderLeft: "5px solid #2fa876", background: "#f3faf6", padding: "22px 26px" }}>
          <span className="eyebrow green" style={{ fontSize: "11px" }}>TODAY'S REPORT SUBMITTED</span>
          <h3 style={{ margin: "6px 0 4px", fontSize: "18px", color: "#144230" }}>You have submitted today's report ({todayReport.reportDate})</h3>
          <p style={{ margin: "0 0 16px", color: "#50695d", fontSize: "11px" }}>
            Submitted at {todayReport.createdAt ? new Date(todayReport.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", background: "#fff", padding: "18px", borderRadius: "14px", border: "1px solid #dbebe2" }}>
            <div><strong style={{ display: "block", fontSize: "10px", color: "#6a7d74", textTransform: "uppercase", letterSpacing: "0.06em" }}>Tasks & Learnings</strong><p style={{ margin: "6px 0 0", fontSize: "12px", color: "#1b2c24", whiteSpace: "pre-wrap", lineHeight: "1.55" }}>{todayReport.tasksCompleted}</p></div>
            <div><strong style={{ display: "block", fontSize: "10px", color: "#6a7d74", textTransform: "uppercase", letterSpacing: "0.06em" }}>Blockers / Issues</strong><p style={{ margin: "6px 0 0", fontSize: "12px", color: todayReport.blockers !== "None" ? "#c62828" : "#1b2c24", whiteSpace: "pre-wrap", lineHeight: "1.55", fontWeight: todayReport.blockers !== "None" ? "600" : "normal" }}>{todayReport.blockers}</p></div>
            <div><strong style={{ display: "block", fontSize: "10px", color: "#6a7d74", textTransform: "uppercase", letterSpacing: "0.06em" }}>Plan for Tomorrow</strong><p style={{ margin: "6px 0 0", fontSize: "12px", color: "#1b2c24", whiteSpace: "pre-wrap", lineHeight: "1.55" }}>{todayReport.planForTomorrow}</p></div>
            <div><strong style={{ display: "block", fontSize: "10px", color: "#6a7d74", textTransform: "uppercase", letterSpacing: "0.06em" }}>Equipment Used</strong><p style={{ margin: "6px 0 0", fontSize: "12px", color: "#1b2c24", whiteSpace: "pre-wrap", lineHeight: "1.55" }}>{todayReport.equipmentsUsed || "N/A"}</p></div>
          </div>
        </div>
      ) : null}

      {/* Submission Form */}
      <div className="card" style={{ padding: "24px" }}>
        <h3 style={{ fontSize: "18px", margin: "0 0 6px" }}>Submit New Work Report</h3>
        <p className="section-sub" style={{ marginBottom: "20px", fontSize: "12px" }}>Fill in your daily activities according to the company work report policy.</p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px" }}>
            <div className="field">
              <label style={{ fontSize: "11px", fontWeight: "600", textTransform: "uppercase", color: "#54665f" }}>Employee Name & ID</label>
              <input type="text" value={(user?.name || "Employee") + " (" + (user?.employeeId || "—") + ")"} disabled style={{ background: "#f5f7f6", color: "#45544e", fontSize: "13px", padding: "12px" }} />
            </div>
            <div className="field">
              <label style={{ fontSize: "11px", fontWeight: "600", textTransform: "uppercase", color: "#54665f" }}>Report Date *</label>
              <input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} required style={{ fontSize: "13px", padding: "12px" }} />
            </div>
          </div>

          <div className="field">
            <label style={{ fontSize: "11px", fontWeight: "600", textTransform: "uppercase", color: "#54665f" }}>Tasks Completed or Today's Learnings *</label>
            <textarea
              rows={4}
              placeholder="Describe in detail the tasks completed today, project updates, or technical learnings..."
              value={tasksCompleted}
              onChange={(e) => setTasksCompleted(e.target.value)}
              required
              style={{ width: "100%", padding: "12px 14px", borderRadius: "10px", border: "1px solid #d0dad5", fontSize: "13px", lineHeight: "1.55" }}
            />
          </div>

          <div className="field">
            <label style={{ fontSize: "11px", fontWeight: "600", textTransform: "uppercase", color: "#54665f" }}>Blockers / Issues Faced *</label>
            <textarea
              rows={2}
              placeholder="Mention any impediments, hardware issues, or support required (Enter 'None' if no issues)..."
              value={blockers}
              onChange={(e) => setBlockers(e.target.value)}
              required
              style={{ width: "100%", padding: "12px 14px", borderRadius: "10px", border: "1px solid #d0dad5", fontSize: "13px", lineHeight: "1.55" }}
            />
          </div>

          <div className="field">
            <label style={{ fontSize: "11px", fontWeight: "600", textTransform: "uppercase", color: "#54665f" }}>Plan for Tomorrow *</label>
            <textarea
              rows={3}
              placeholder="Outline key deliverables, targets, or scheduled activities for tomorrow..."
              value={planForTomorrow}
              onChange={(e) => setPlanForTomorrow(e.target.value)}
              required
              style={{ width: "100%", padding: "12px 14px", borderRadius: "10px", border: "1px solid #d0dad5", fontSize: "13px", lineHeight: "1.55" }}
            />
          </div>

          <div className="field">
            <label style={{ fontSize: "11px", fontWeight: "600", textTransform: "uppercase", color: "#54665f" }}>Company Equipment Used (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Daloft Drone Alpha-1, Oscilloscope, Workstation #3..."
              value={equipmentsUsed}
              onChange={(e) => setEquipmentsUsed(e.target.value)}
              style={{ width: "100%", padding: "12px 14px", borderRadius: "10px", border: "1px solid #d0dad5", fontSize: "13px" }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" className="btn btn-primary" disabled={submitting} style={{ fontSize: "13px", padding: "12px 20px" }}>
              {submitting ? "Submitting Report…" : "Submit Daily Work Report →"}
            </button>
          </div>
        </form>
      </div>

      {/* Submission History Table */}
      <div className="card" style={{ padding: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ fontSize: "18px", margin: 0 }}>My Submission History</h3>
          <span style={{ fontSize: "12px", color: "#7b8983" }}>Total Reports: <strong style={{ color: "#143a2b" }}>{history.length}</strong></span>
        </div>

        {loading ? (
          <div className="empty-state" style={{ padding: "40px", fontSize: "13px" }}>Loading your submission history…</div>
        ) : (
          <div className="table-wrap">
            <table style={{ width: "100%", fontSize: "12px" }}>
              <thead>
                <tr>
                  <th style={{ fontSize: "11px", padding: "12px 10px" }}>Date</th>
                  <th style={{ fontSize: "11px", padding: "12px 10px" }}>Tasks Completed & Learnings</th>
                  <th style={{ fontSize: "11px", padding: "12px 10px" }}>Blockers</th>
                  <th style={{ fontSize: "11px", padding: "12px 10px" }}>Plan for Tomorrow</th>
                  <th style={{ fontSize: "11px", padding: "12px 10px" }}>Equipment Used</th>
                  <th style={{ fontSize: "11px", padding: "12px 10px" }}>Submitted At</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontSize: "13px", fontWeight: "600", whiteSpace: "nowrap", padding: "12px 10px" }}>
                      {item.reportDate}
                    </td>
                    <td style={{ maxWidth: "300px", whiteSpace: "pre-wrap", fontSize: "12px", lineHeight: "1.55", padding: "12px 10px" }}>
                      {item.tasksCompleted}
                    </td>
                    <td style={{ maxWidth: "180px", whiteSpace: "pre-wrap", fontSize: "12px", lineHeight: "1.55", padding: "12px 10px", color: item.blockers !== "None" ? "#c62828" : "#3b4d45", fontWeight: item.blockers !== "None" ? "600" : "normal" }}>
                      {item.blockers}
                    </td>
                    <td style={{ maxWidth: "220px", whiteSpace: "pre-wrap", fontSize: "12px", lineHeight: "1.55", padding: "12px 10px" }}>
                      {item.planForTomorrow}
                    </td>
                    <td style={{ fontSize: "12px", padding: "12px 10px" }}>
                      {item.equipmentsUsed || "N/A"}
                    </td>
                    <td style={{ fontSize: "11px", color: "#75857f", whiteSpace: "nowrap", padding: "12px 10px" }}>
                      {item.createdAt ? new Date(item.createdAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "—"}
                    </td>
                  </tr>
                ))}
                {!history.length && (
                  <tr>
                    <td colSpan="6" className="empty-state" style={{ padding: "40px", fontSize: "13px" }}>No daily work reports submitted yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
