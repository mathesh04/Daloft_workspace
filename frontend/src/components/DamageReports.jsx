import React, { useEffect, useState } from "react";
import api from "../api/api";

export default function DamageReports({ adminMode = false }) {
  const [rows, setRows] = useState([]);
  const [assets, setAssets] = useState([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    componentId: "",
    issueType: "DAMAGED",
    severity: "MEDIUM",
    description: ""
  });

  const load = async () => {
    try {
      setError("");
      if (adminMode) {
        setRows(await api.allDamageReports());
      } else {
        const [reports, requests] = await Promise.all([
          api.myDamageReports(),
          api.myInventoryRequests()
        ]);
        setRows(reports || []);
        setAssets((requests || []).filter(request => request.status === "APPROVED"));
      }
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => { load(); }, [adminMode]);

  async function submit(event) {
    event.preventDefault();
    if (!form.componentId) {
      setError("Please select one of your assigned components.");
      return;
    }

    try {
      setError("");
      await api.createDamageReport({
        ...form,
        componentId: Number(form.componentId)
      });
      setForm({
        componentId: "",
        issueType: "DAMAGED",
        severity: "MEDIUM",
        description: ""
      });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="card">
      <h3>{adminMode ? "Damage Reports" : "Report Damage / Issue"}</h3>
      {error && <div className="error-banner">{error}</div>}

      {!adminMode && (
        <form onSubmit={submit} className="form-grid">
          <select
            value={form.componentId}
            onChange={event => setForm({ ...form, componentId: event.target.value })}
            required
          >
            <option value="">Select assigned component</option>
            {assets.map(request => (
              <option key={request.id} value={request.component.id}>
                {request.component.name} ({request.component.componentCode})
              </option>
            ))}
          </select>

          <select
            value={form.issueType}
            onChange={event => setForm({ ...form, issueType: event.target.value })}
          >
            <option value="DAMAGED">DAMAGED</option>
            <option value="LOST">LOST</option>
            <option value="MALFUNCTION">MALFUNCTION</option>
            <option value="OTHER">OTHER</option>
          </select>

          <select
            value={form.severity}
            onChange={event => setForm({ ...form, severity: event.target.value })}
          >
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
          </select>

          <textarea
            placeholder="Describe the issue"
            value={form.description}
            onChange={event => setForm({ ...form, description: event.target.value })}
          />

          <button className="btn btn-accent" disabled={assets.length === 0}>
            Submit Report
          </button>

          {assets.length === 0 && (
            <div className="empty-state">
              You need an approved assigned component before submitting a damage report.
            </div>
          )}
        </form>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Component</th>
              <th>Issue</th>
              <th>Severity</th>
              <th>Status</th>
              {adminMode && <th>Update</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map(report => (
              <tr key={report.id}>
                <td>{report.employee?.name || "Me"}</td>
                <td>{report.componentId}</td>
                <td>{report.issueType}</td>
                <td>{report.severity}</td>
                <td>{report.status}</td>
                {adminMode && (
                  <td>
                    <select
                      value={report.status}
                      onChange={event =>
                        api.updateDamageStatus(report.id, event.target.value).then(load).catch(err => setError(err.message))
                      }
                    >
                      {["REPORTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "RESOLVED"].map(status => (
                        <option key={status}>{status}</option>
                      ))}
                    </select>
                  </td>
                )}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={adminMode ? 6 : 5} className="empty-state">
                  No damage reports yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
