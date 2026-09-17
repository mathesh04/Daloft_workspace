import React, { useEffect, useMemo, useState } from "react";
import api from "../api/api";

function Modal({ title, onClose, children }) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-header">
          <h3>{title}</h3>

          <button
            type="button"
            className="modal-close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

function Toast({ toast, onClose }) {
  if (!toast) {
    return null;
  }

  return (
    <div className="toast toast-success">
      <span>✓</span>

      <div>
        <strong>{toast.title}</strong>
        <div>{toast.message}</div>
      </div>

      <button
        type="button"
        onClick={onClose}
      >
        ×
      </button>
    </div>
  );
}

function Badge({ v }) {
  const value = String(v || "");

  const c =
    value === "APPROVED" ||
    value === "IN_USE" ||
    value === "RETURNED"
      ? "badge-success"
      : value === "REJECTED" ||
        value === "DAMAGED" ||
        value === "RETURN_REJECTED"
      ? "badge-danger"
      : "badge-warning";

  return (
    <span className={`badge ${c}`}>
      {value.replaceAll("_", " ")}
    </span>
  );
}

export default function EmployeeInventory() {
  const [tab, setTab] = useState("available");

  const [items, setItems] = useState([]);
  const [reqs, setReqs] = useState([]);
  const [usage, setUsage] = useState([]);
  const [mine, setMine] = useState([]);

  const [err, setErr] = useState("");
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");

  const notify = (title, message) => {
    setToast({
      title,
      message
    });

    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  const load = async () => {
    try {
      setErr("");

      const [
        available,
        requests,
        usageUpdates,
        myItems
      ] = await Promise.all([
        api.getAvailableInventory(),
        api.myInventoryRequests(),
        api.myUsageUpdates(),
        api.myInventoryItems()
      ]);

      setItems(available || []);
      setReqs(requests || []);
      setUsage(usageUpdates || []);
      setMine(myItems || []);
    } catch (e) {
      setErr(
        e?.message ||
          "Unable to load inventory information."
      );
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search
      .toLowerCase()
      .trim();

    if (!q) {
      return items;
    }

    return items.filter((i) =>
      [
        i.name,
        i.componentCode,
        i.category,
        i.storageLocation
      ].some((v) =>
        String(v || "")
          .toLowerCase()
          .includes(q)
      )
    );
  }, [items, search]);

  const submitRequest = async (e) => {
    e.preventDefault();

    const f = modal.form;

    const quantity = Number(
      f.quantity
    );

    const available = Number(
      modal.item.availableQuantity
    );

    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > available
    ) {
      setErr(
        `Choose a quantity between 1 and ${available}.`
      );
      return;
    }

    setBusy(true);
    setErr("");

    try {
      await api.createInventoryRequest({
        componentId: modal.item.id,
        quantity,
        purpose: f.purpose
      });

      setModal(null);

      notify(
        "Request submitted",
        "Your request is waiting for admin approval."
      );

      await load();
    } catch (e) {
      setErr(
        e?.message ||
          "Unable to submit inventory request."
      );
    } finally {
      setBusy(false);
    }
  };

  const submitUsage = async (e) => {
    e.preventDefault();

    const f = modal.form;

    if (!f.usageStatus) {
      setErr("Select a usage status.");
      return;
    }

    const quantity = Number(
      f.quantity
    );

    const maxQuantity = Number(
      modal.request.actionableQuantity
    );

    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > maxQuantity
    ) {
      setErr(
        `Choose a quantity between 1 and ${maxQuantity}.`
      );
      return;
    }

    setBusy(true);
    setErr("");

    try {
      await api.submitUsageUpdate({
        requestId: modal.request.id,
        quantity,
        usageStatus: f.usageStatus,
        projectName: f.projectName,
        notes: f.notes
      });

      const isReturn =
        f.usageStatus === "RETURN_REQUESTED";

      setModal(null);

      notify(
        isReturn
          ? "Return requested"
          : "Usage update sent",
        isReturn
          ? "The item remains assigned to you until admin approves the return."
          : "The admin can now review this update."
      );

      await load();
    } catch (e) {
      setErr(
        e?.message ||
          "Unable to submit usage update."
      );
    } finally {
      setBusy(false);
    }
  };

  const openUsageModal = (asset) => {
    const remaining =
      Number(asset.remainingQuantity || 0);

    const pending =
      Number(asset.pendingReturnQuantity || 0);

    const returnable =
      Number(
        asset.returnableQuantity ??
          Math.max(
            0,
            remaining - pending
          )
      );

    setModal({
      type: "usage",

      request: {
        ...asset,
        actionableQuantity:
          returnable
      },

      form: {
        usageStatus: "RETURN_REQUESTED",
        quantity:
          returnable > 0
            ? returnable
            : 1,
        projectName: "",
        notes: ""
      }
    });
  };

  const pendingReturnCount = usage.filter(
    (u) =>
      u.usageStatus ===
      "RETURN_REQUESTED"
  ).length;

  const pendingRequestCount =
    reqs.filter(
      (r) =>
        r.status === "PENDING"
    ).length;

  return (
    <div className="inventory-workspace">
      <Toast
        toast={toast}
        onClose={() =>
          setToast(null)
        }
      />

      {err && (
        <div className="error-banner">
          <span>{err}</span>

          <button
            type="button"
            onClick={() =>
              setErr("")
            }
          >
            ×
          </button>
        </div>
      )}

      <div className="inventory-head">
        <div>
          <h2 className="section-title">
            My Hardware
          </h2>

          <p className="section-sub">
            Request equipment, track assigned
            assets and manage returns.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-ghost"
          onClick={load}
          disabled={busy}
        >
          ↻ Refresh
        </button>
      </div>

      <div
        className="grid grid-3"
        style={{
          marginBottom: 18
        }}
      >
        <div className="stat-card">
          <div className="stat-label">
            My assets
          </div>

          <div className="stat-value">
            {mine.length}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">
            Pending requests
          </div>

          <div className="stat-value">
            {pendingRequestCount}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">
            Return requests
          </div>

          <div className="stat-value">
            {pendingReturnCount}
          </div>
        </div>
      </div>

      <div className="tabs">
        {[
          [
            "available",
            "Available Inventory"
          ],
          [
            "requests",
            "My Requests"
          ],
          [
            "mine",
            "My Assets"
          ],
          [
            "usage",
            "Usage Updates"
          ]
        ].map(([k, label]) => (
          <button
            type="button"
            key={k}
            className={`tab-btn ${
              tab === k
                ? "active"
                : ""
            }`}
            onClick={() =>
              setTab(k)
            }
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "available" && (
        <div className="card">
          <div className="card-title-row">
            <div>
              <h3>
                Available hardware
              </h3>

              <p>
                Items currently available
                to request.
              </p>
            </div>

            <div className="search-box">
              <span>⌕</span>

              <input
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value
                  )
                }
                placeholder="Search hardware…"
              />
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Component</th>
                  <th>Category</th>
                  <th>Available</th>
                  <th>Location</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((i) => (
                  <tr key={i.id}>
                    <td>
                      <span className="code-chip">
                        {i.componentCode}
                      </span>
                    </td>

                    <td>
                      <b>{i.name}</b>
                    </td>

                    <td>
                      {i.category}
                    </td>

                    <td>
                      {i.availableQuantity}
                    </td>

                    <td>
                      {i.storageLocation ||
                        "—"}
                    </td>

                    <td>
                      <button
                        type="button"
                        className="btn btn-accent btn-sm"
                        disabled={
                          !i.availableQuantity
                        }
                        onClick={() =>
                          setModal({
                            type: "request",
                            item: i,
                            form: {
                              quantity: 1,
                              purpose: ""
                            }
                          })
                        }
                      >
                        Request
                      </button>
                    </td>
                  </tr>
                ))}

                {!filtered.length && (
                  <tr>
                    <td
                      colSpan="6"
                      className="empty-state"
                    >
                      No available hardware
                      matches your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "requests" && (
        <div className="card">
          <h3>My requests</h3>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Component</th>
                  <th>Qty</th>
                  <th>Purpose</th>
                  <th>Status</th>
                  <th>Admin remark</th>
                </tr>
              </thead>

              <tbody>
                {reqs.map((r) => (
                  <tr key={r.id}>
                    <td>
                      {r.requestedAt
                        ? new Date(
                            r.requestedAt
                          ).toLocaleString()
                        : "—"}
                    </td>

                    <td>
                      <b>
                        {r.component?.name}
                      </b>

                      <small>
                        {
                          r.component
                            ?.componentCode
                        }
                      </small>
                    </td>

                    <td>
                      {r.quantity}
                    </td>

                    <td>
                      {r.purpose ||
                        "—"}
                    </td>

                    <td>
                      <Badge
                        v={r.status}
                      />
                    </td>

                    <td>
                      {r.adminRemark ||
                        "—"}
                    </td>
                  </tr>
                ))}

                {!reqs.length && (
                  <tr>
                    <td
                      colSpan="6"
                      className="empty-state"
                    >
                      No requests yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "mine" && (
        <div className="card">
          <h3>
            My issued assets
          </h3>

          <p className="section-sub">
            Your asset remains assigned
            until a return is approved
            by an administrator.
          </p>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Component</th>
                  <th>Assigned</th>
                  <th>Pending Return</th>
                  <th>Remaining</th>
                  <th>Purpose</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {mine.map((asset) => {
                  const issued =
                    Number(
                      asset.issuedQuantity ||
                        0
                    );

                  const pending =
                    Number(
                      asset.pendingReturnQuantity ||
                        0
                    );

                  const remaining =
                    Number(
                      asset.remainingQuantity ||
                        0
                    );

                  const returnable =
                    Number(
                      asset.returnableQuantity ??
                        Math.max(
                          0,
                          remaining -
                            pending
                        )
                    );

                  return (
                    <tr
                      key={asset.id}
                    >
                      <td>
                        <b>
                          {
                            asset.component
                              ?.name
                          }
                        </b>

                        <small>
                          {
                            asset.component
                              ?.componentCode
                          }
                        </small>
                      </td>

                      <td>
                        {issued}
                      </td>

                      <td>
                        {pending > 0 ? (
                          <span>
                            {pending} pending
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>

                      <td>
                        <b>
                          {remaining}
                        </b>
                      </td>

                      <td>
                        {asset.purpose ||
                          "—"}
                      </td>

                      <td>
                        <Badge
                          v={
                            asset.assignmentStatus ||
                            "ASSIGNED"
                          }
                        />
                      </td>

                      <td>
                        {returnable > 0 ? (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() =>
                              openUsageModal(
                                asset
                              )
                            }
                          >
                            Return / Update
                          </button>
                        ) : (
                          <span>
                            Return pending
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {!mine.length && (
                  <tr>
                    <td
                      colSpan="7"
                      className="empty-state"
                    >
                      You have no approved
                      assigned assets.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "usage" && (
        <div className="card">
          <h3>
            My usage updates
          </h3>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Component</th>
                  <th>Qty</th>
                  <th>Status</th>
                  <th>Project</th>
                  <th>Notes</th>
                </tr>
              </thead>

              <tbody>
                {usage.map((u) => (
                  <tr key={u.id}>
                    <td>
                      {u.createdAt
                        ? new Date(
                            u.createdAt
                          ).toLocaleString()
                        : "—"}
                    </td>

                    <td>
                      {u.component?.name}
                    </td>

                    <td>
                      {u.quantity}
                    </td>

                    <td>
                      <Badge
                        v={
                          u.usageStatus
                        }
                      />
                    </td>

                    <td>
                      {u.projectName ||
                        "—"}
                    </td>

                    <td>
                      {u.notes ||
                        "—"}
                    </td>
                  </tr>
                ))}

                {!usage.length && (
                  <tr>
                    <td
                      colSpan="6"
                      className="empty-state"
                    >
                      No usage updates yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal?.type === "request" && (
        <Modal
          title={`Request ${modal.item.name}`}
          onClose={() =>
            setModal(null)
          }
        >
          <form
            onSubmit={
              submitRequest
            }
          >
            <div className="review-summary">
              <b>
                {modal.item.name}
              </b>

              <span>
                {modal.item.componentCode}
                {" · "}
                {
                  modal.item
                    .availableQuantity
                }{" "}
                units available
              </span>

              <span>
                {modal.item
                  .storageLocation ||
                  "Storage location not set"}
              </span>
            </div>

            <div className="field">
              <label>
                Quantity *
              </label>

              <input
                type="number"
                min="1"
                max={
                  modal.item
                    .availableQuantity
                }
                value={
                  modal.form.quantity
                }
                onChange={(e) =>
                  setModal({
                    ...modal,
                    form: {
                      ...modal.form,
                      quantity:
                        e.target.value
                    }
                  })
                }
                required
              />
            </div>

            <div className="field">
              <label>
                Purpose / project
              </label>

              <textarea
                value={
                  modal.form.purpose
                }
                onChange={(e) =>
                  setModal({
                    ...modal,
                    form: {
                      ...modal.form,
                      purpose:
                        e.target.value
                    }
                  })
                }
                placeholder="Why do you need this hardware?"
              />
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() =>
                  setModal(null)
                }
              >
                Cancel
              </button>

              <button
                disabled={busy}
                className="btn btn-accent"
              >
                {busy
                  ? "Submitting…"
                  : "Submit request"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {modal?.type === "usage" && (
        <Modal
          title={`Update ${modal.request.component?.name}`}
          onClose={() =>
            setModal(null)
          }
        >
          <form
            onSubmit={
              submitUsage
            }
          >
            <div className="review-summary">
              <b>
                {
                  modal.request
                    .component?.name
                }
              </b>

              <span>
                Assigned:{" "}
                {
                  modal.request
                    .issuedQuantity
                }
                {" · "}
                Remaining:{" "}
                {
                  modal.request
                    .remainingQuantity
                }
              </span>

              {Number(
                modal.request
                  .pendingReturnQuantity ||
                  0
              ) > 0 && (
                <span>
                  Pending return:{" "}
                  {
                    modal.request
                      .pendingReturnQuantity
                  }
                </span>
              )}

              <span>
                Available for new
                update:{" "}
                {
                  modal.request
                    .actionableQuantity
                }
              </span>
            </div>

            <div className="field">
              <label>
                Status *
              </label>

              <select
                value={
                  modal.form
                    .usageStatus
                }
                onChange={(e) =>
                  setModal({
                    ...modal,
                    form: {
                      ...modal.form,
                      usageStatus:
                        e.target.value
                    }
                  })
                }
              >
                <option value="RETURN_REQUESTED">
                  Request return
                </option>

                <option value="IN_USE">
                  In use
                </option>

                <option value="CONSUMED">
                  Consumed
                </option>

                <option value="DAMAGED">
                  Damaged
                </option>
              </select>
            </div>

            <div className="field">
              <label>
                Quantity *
              </label>

              <input
                type="number"
                min="1"
                max={
                  modal.request
                    .actionableQuantity
                }
                value={
                  modal.form.quantity
                }
                onChange={(e) =>
                  setModal({
                    ...modal,
                    form: {
                      ...modal.form,
                      quantity:
                        e.target.value
                    }
                  })
                }
                required
              />

              <small>
                Maximum:{" "}
                {
                  modal.request
                    .actionableQuantity
                }{" "}
                unit(s)
              </small>
            </div>

            <div className="field">
              <label>
                Project name
              </label>

              <input
                value={
                  modal.form.projectName
                }
                onChange={(e) =>
                  setModal({
                    ...modal,
                    form: {
                      ...modal.form,
                      projectName:
                        e.target.value
                    }
                  })
                }
              />
            </div>

            <div className="field">
              <label>
                Notes
              </label>

              <textarea
                value={
                  modal.form.notes
                }
                onChange={(e) =>
                  setModal({
                    ...modal,
                    form: {
                      ...modal.form,
                      notes:
                        e.target.value
                    }
                  })
                }
                placeholder="Usage details, condition, issue…"
              />
            </div>

            {modal.form
              .usageStatus ===
              "RETURN_REQUESTED" && (
              <div className="review-summary">
                <strong>
                  Return approval
                </strong>

                <span>
                  The asset will remain
                  assigned to you until
                  an administrator
                  approves this return.
                </span>
              </div>
            )}

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() =>
                  setModal(null)
                }
              >
                Cancel
              </button>

              <button
                disabled={busy}
                className="btn btn-accent"
              >
                {busy
                  ? "Sending…"
                  : "Save update"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}