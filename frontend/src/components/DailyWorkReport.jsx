import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api/api";
import { todayIST, istDateTime, istTime } from "../utils/datetime";

export default function DailyWorkReport() {
  const { user } = useAuth();
  const [reportDate, setReportDate] = useState(() => todayIST());
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

  const PAGE_SIZE = 10;
  const [historyPage, setHistoryPage] = useState(0);
  useEffect(() => { setHistoryPage(0); }, [history.length]);
  const historyPages = Math.ceil(history.length / PAGE_SIZE);
  const currentHistory = history.slice(historyPage * PAGE_SIZE, (historyPage + 1) * PAGE_SIZE);

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
    
      <div className="premium-card" style={{ background: "#FFFFFF", color: "#14161A", padding: "24px 28px", borderLeft: "3px solid #2563EB" }}>
        <span className="eyebrow" style={{ color: "#2563EB", fontSize: "11px", fontWeight: "600", letterSpacing: "0.08em" }}>DAILY WORK LOG</span>
        <h2 style={{ color: "#14161A", margin: "6px 0 8px", fontSize: "24px" }}>Daily Work Report Submission</h2>
        <p style={{ color: "#67707F", margin: 0, fontSize: "13px", maxWidth: "680px", lineHeight: 1.55 }}>
          Log your completed tasks, daily learnings, blockers, and plan for tomorrow. Reports are immediately logged to HR & Operations for daily review.
        </p>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {message && <div className="success-banner">{message}</div>}


      {todayReport ? (
        <div className="premium-card" style={{ borderLeft: "5px solid #12B76A", background: "#F9FAFB", padding: "22px 26px" }}>
          <span className="eyebrow green" style={{ fontSize: "11px" }}>TODAY'S REPORT SUBMITTED</span>
          <h3 style={{ margin: "6px 0 4px", fontSize: "18px", color: "#14161A" }}>You have submitted today's report ({todayReport.reportDate})</h3>
          <p style={{ margin: "0 0 16px", color: "#47505E", fontSize: "11px" }}>
            Submitted at {todayReport.createdAt ? istTime(todayReport.createdAt) : "—"}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", background: "#FFFFFF", padding: "18px", borderRadius: "14px", border: "1px solid #F9FAFB" }}>
            <div><strong style={{ display: "block", fontSize: "12px", color: "#67707F", textTransform: "uppercase", letterSpacing: "0.06em" }}>Tasks & Learnings</strong><p style={{ margin: "6px 0 0", fontSize: "12px", color: "#3E434D", whiteSpace: "pre-wrap", lineHeight: "1.55" }}>{todayReport.tasksCompleted}</p></div>
            <div><strong style={{ display: "block", fontSize: "12px", color: "#67707F", textTransform: "uppercase", letterSpacing: "0.06em" }}>Blockers / Issues</strong><p style={{ margin: "6px 0 0", fontSize: "12px", color: todayReport.blockers !== "None" ? "#B42318" : "#3E434D", whiteSpace: "pre-wrap", lineHeight: "1.55", fontWeight: todayReport.blockers !== "None" ? "600" : "normal" }}>{todayReport.blockers}</p></div>
            <div><strong style={{ display: "block", fontSize: "12px", color: "#67707F", textTransform: "uppercase", letterSpacing: "0.06em" }}>Plan for Tomorrow</strong><p style={{ margin: "6px 0 0", fontSize: "12px", color: "#3E434D", whiteSpace: "pre-wrap", lineHeight: "1.55" }}>{todayReport.planForTomorrow}</p></div>
            <div><strong style={{ display: "block", fontSize: "12px", color: "#67707F", textTransform: "uppercase", letterSpacing: "0.06em" }}>Equipment Used</strong><p style={{ margin: "6px 0 0", fontSize: "12px", color: "#3E434D", whiteSpace: "pre-wrap", lineHeight: "1.55" }}>{todayReport.equipmentsUsed || "N/A"}</p></div>
          </div>
        </div>
      ) : null}


      <div className="card dwr-form-card">
        <h3>Submit New Work Report</h3>
        <p className="section-sub">Fill in your daily activities according to the company work report policy.</p>

        <form onSubmit={handleSubmit} className="dwr-form">
          <div className="dwr-form-row">
            <div className="field">
              <label>Employee Name & ID</label>
              <input type="text" value={(user?.name || "Employee") + " (" + (user?.employeeId || "—") + ")"} disabled />
            </div>
            <div className="field">
              <label>Report Date *</label>
              <input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} required />
            </div>
          </div>

          <div className="field">
            <label>Tasks Completed or Today's Learnings *</label>
            <textarea
              rows={4}
              placeholder="Describe in detail the tasks completed today, project updates, or technical learnings..."
              value={tasksCompleted}
              onChange={(e) => setTasksCompleted(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label>Blockers / Issues Faced *</label>
            <textarea
              rows={2}
              placeholder="Mention any impediments, hardware issues, or support required (Enter 'None' if no issues)..."
              value={blockers}
              onChange={(e) => setBlockers(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label>Plan for Tomorrow *</label>
            <textarea
              rows={3}
              placeholder="Outline key deliverables, targets, or scheduled activities for tomorrow..."
              value={planForTomorrow}
              onChange={(e) => setPlanForTomorrow(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label>Company Equipment Used (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Daloft Drone Alpha-1, Oscilloscope, Workstation #3..."
              value={equipmentsUsed}
              onChange={(e) => setEquipmentsUsed(e.target.value)}
            />
          </div>

          <div className="dwr-form-actions">
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "Submitting Report…" : "Submit Daily Work Report →"}
            </button>
          </div>
        </form>
      </div>

      <div className="card" style={{ padding: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ fontSize: "18px", margin: 0 }}>My Submission History</h3>
          <span style={{ fontSize: "14px", color: "#67707F" }}>Total Reports: <strong style={{ color: "#14161A" }}>{history.length}</strong></span>
        </div>

        {loading ? (
          <div className="empty-state" style={{ padding: "40px", fontSize: "14px" }}>Loading your submission history…</div>
        ) : (
          <div className="table-wrap">
            <table style={{ width: "100%", fontSize: "14px" }}>
              <thead>
                <tr>
                  <th style={{ fontSize: "14px", padding: "12px 10px" }}>Date</th>
                  <th style={{ fontSize: "14px", padding: "12px 10px" }}>Tasks Completed & Learnings</th>
                  <th style={{ fontSize: "14px", padding: "12px 10px" }}>Blockers</th>
                  <th style={{ fontSize: "14px", padding: "12px 10px" }}>Plan for Tomorrow</th>
                  <th style={{ fontSize: "14px", padding: "12px 10px" }}>Equipment Used</th>
                  <th style={{ fontSize: "14px", padding: "12px 10px" }}>Submitted At</th>
                </tr>
              </thead>
              <tbody>
                {currentHistory.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontSize: "14px", fontWeight: "600", whiteSpace: "nowrap", padding: "12px 10px" }}>
                      {item.reportDate}
                    </td>
                    <td style={{ maxWidth: "300px", whiteSpace: "pre-wrap", fontSize: "14px", lineHeight: "1.55", padding: "12px 10px" }}>
                      {item.tasksCompleted}
                    </td>
                    <td style={{ maxWidth: "180px", whiteSpace: "pre-wrap", fontSize: "14px", lineHeight: "1.55", padding: "12px 10px", color: item.blockers !== "None" ? "#B42318" : "#14161A", fontWeight: item.blockers !== "None" ? "600" : "normal" }}>
                      {item.blockers}
                    </td>
                    <td style={{ maxWidth: "220px", whiteSpace: "pre-wrap", fontSize: "14px", lineHeight: "1.55", padding: "12px 10px" }}>
                      {item.planForTomorrow}
                    </td>
                    <td style={{ fontSize: "14px", padding: "12px 10px" }}>
                      {item.equipmentsUsed || "N/A"}
                    </td>
                    <td style={{ fontSize: "14px", color: "#67707F", whiteSpace: "nowrap", padding: "12px 10px" }}>
                      {item.createdAt ? istDateTime(item.createdAt) : "—"}
                    </td>
                  </tr>
                ))}
                {!history.length && (
                  <tr>
                    <td colSpan="6" className="empty-state" style={{ padding: "40px", fontSize: "14px" }}>No daily work reports submitted yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {historyPages > 1 && (
          <div className="pagination" style={{ padding: "14px 4px 0", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #F9FAFB", marginTop: "12px" }}>
            <span style={{ fontSize: "13px", color: "#67707F" }}>
              Showing {historyPage * PAGE_SIZE + 1}–{Math.min((historyPage + 1) * PAGE_SIZE, history.length)} of {history.length} submissions (Page {historyPage + 1} of {historyPages})
            </span>
            <div style={{ display: "flex", gap: "6px" }}>
              <button className="btn btn-ghost btn-sm" disabled={historyPage === 0} onClick={() => setHistoryPage(p => Math.max(0, p - 1))}>
                ← Previous
              </button>
              <button className="btn btn-ghost btn-sm" disabled={historyPage >= historyPages - 1} onClick={() => setHistoryPage(p => Math.min(historyPages - 1, p + 1))}>
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
