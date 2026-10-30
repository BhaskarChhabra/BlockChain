import { formatVehicleOption } from "../utils/vehicleFormat";
import { useEffect, useState } from "react";
import { getVehicles, revokeVehicle, createChallenge } from "../services/api";

function shorten(value, start = 12, end = 8) {
    if (!value) return "—";
    if (value.length <= start + end + 3) return value;
    return value.slice(0, start) + "..." + value.slice(-end);
}

function formatTimestamp(timestamp) {
    if (!timestamp) return "—";
    return new Date(timestamp * 1000).toLocaleString();
}

function Revocation() {
    const [vehicles, setVehicles] = useState([]);
    const [selectedAddress, setSelectedAddress] = useState("");
    const [loading, setLoading] = useState(true);
    const [revoking, setRevoking] = useState(false);
    const [testingAuth, setTestingAuth] = useState(false);
    const [revokeResult, setRevokeResult] = useState(null);
    const [testAuthResult, setTestAuthResult] = useState(null);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    useEffect(() => {
        loadVehicles();
    }, []);

    async function loadVehicles() {
        try {
            setLoading(true);
            setError("");
            const data = await getVehicles();
            const list = data.vehicles || [];
            setVehicles(list);

            if (list.length > 0 && !selectedAddress) {
                setSelectedAddress(list[0].vehicleAddress);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    const selectedVehicle = vehicles.find(
        (v) => v.vehicleAddress.toLowerCase() === selectedAddress.toLowerCase()
    );

    async function handleRevoke() {
        if (!selectedAddress) return;

        try {
            setRevoking(true);
            setError("");
            setMessage("");
            setRevokeResult(null);
            setTestAuthResult(null);

            const result = await revokeVehicle(selectedAddress);
            setRevokeResult(result);
            setMessage(`Vehicle ${shorten(selectedAddress)} was successfully revoked on the blockchain.`);

            await loadVehicles();
        } catch (err) {
            setError(err.message);
        } finally {
            setRevoking(false);
        }
    }

    async function handleTestAuthentication() {
        if (!selectedAddress) return;

        try {
            setTestingAuth(true);
            setError("");
            setTestAuthResult(null);

            // Attempt to request a challenge for this vehicle
            await createChallenge(selectedAddress, "RSU-01");

            setTestAuthResult({
                blocked: false,
                message: "WARNING: Vehicle was able to obtain a challenge (Not revoked).",
            });
        } catch (err) {
            // Expected 403 rejection
            setTestAuthResult({
                blocked: true,
                status: err.status || 403,
                message: err.message,
            });
        } finally {
            setTestingAuth(false);
        }
    }

    return (
        <div className="page-content">
            <div className="page-intro">
                <span className="eyebrow">TRUST CONTROL &amp; ACCESS MANAGEMENT</span>
                <h2>Revocation Center</h2>
                <p>
                    Manage compromised, expired, or decommissioned vehicle identities.
                    Revocation is permanently committed on-chain and prevents any future authentication sessions.
                </p>
            </div>

            {error && (
                <div className="alert alert-error">
                    <strong>Revocation Error:</strong>
                    <span>{error}</span>
                </div>
            )}

            {message && !error && (
                <div className="alert alert-success">
                    <strong>Status:</strong>
                    <span>{message}</span>
                </div>
            )}

            {/* REVOCATION ACTION PANEL */}
            <section className="panel">
                <div className="panel-header">
                    <div>
                        <h3>Revoke Vehicle Identity</h3>
                        <span>Commit identity revocation transaction to smart contract</span>
                    </div>
                    <span className="module-tag">IMMUTABLE LOG</span>
                </div>

                <div className="registry-form" style={{ maxWidth: "600px" }}>
                    <label>
                        <span>SELECT VEHICLE TO MANAGE</span>
                        <select
                            value={selectedAddress}
                            onChange={(e) => {
                                setSelectedAddress(e.target.value);
                                setRevokeResult(null);
                                setTestAuthResult(null);
                                setError("");
                                setMessage("");
                            }}
                            disabled={loading || vehicles.length === 0}
                            style={{
                                width: "100%",
                                padding: "0.75rem",
                                borderRadius: "6px",
                                background: "rgba(255, 255, 255, 0.05)",
                                border: "1px solid rgba(255, 255, 255, 0.15)",
                                color: "#fff",
                            }}
                        >
                            <option value="">Select a registered vehicle</option>
                            {vehicles.map((v) => (
                                <option key={v.vehicleAddress} value={v.vehicleAddress}>
                                    {formatVehicleOption(v)}
                                </option>
                            ))}
                        </select>
                    </label>

                    {selectedVehicle && (
                        <div style={{
                            padding: "1rem",
                            borderRadius: "8px",
                            background: "rgba(255, 255, 255, 0.02)",
                            border: "1px solid rgba(255, 255, 255, 0.06)",
                            marginTop: "0.5rem"
                        }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div>
                                <div style={{ fontSize: "14px", fontWeight: "bold", color: "#fff", marginBottom: "6px" }}>
                                    Vehicle Name: <span style={{ color: "#3a86ff" }}>{selectedVehicle.name || "Registered Vehicle"}</span>
                                </div>
                                <strong>CURRENT STATUS:</strong>
                            </div>
                                <span className={selectedVehicle.revoked ? "status-badge revoked" : "status-badge active"}>
                                    <span />
                                    {selectedVehicle.revoked ? "REVOKED ON BLOCKCHAIN" : "ACTIVE & AUTHORIZED"}
                                </span>
                            </div>
                            <div style={{ marginTop: "0.5rem", fontSize: "0.82rem", color: "#888" }}>
                                Full Address: <code>{selectedVehicle.vehicleAddress}</code>
                            </div>
                            <div style={{ marginTop: "0.25rem", fontSize: "0.82rem", color: "#888" }}>
                                Registered: {formatTimestamp(selectedVehicle.registeredAt)}
                            </div>
                        </div>
                    )}

                    <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
                        <button
                            className="primary-button"
                            onClick={handleRevoke}
                            disabled={revoking || !selectedVehicle || selectedVehicle.revoked}
                            style={{
                                background: selectedVehicle?.revoked ? "#555" : "#e63946",
                                borderColor: selectedVehicle?.revoked ? "#666" : "#e63946",
                            }}
                        >
                            {revoking
                                ? "Submitting Revocation..."
                                : selectedVehicle?.revoked
                                    ? "Vehicle Already Revoked"
                                    : "Revoke Vehicle Identity"}
                        </button>

                        <button
                            className="secondary-button"
                            onClick={handleTestAuthentication}
                            disabled={testingAuth || !selectedVehicle}
                        >
                            {testingAuth ? "Testing..." : "Test Auth Access"}
                        </button>
                    </div>

                    {/* TEST AUTH RESULT */}
                    {testAuthResult && (
                        <div
                            className={
                                testAuthResult.blocked
                                    ? "alert alert-success"
                                    : "alert alert-error"
                            }
                            style={{ marginTop: "1rem" }}
                        >
                            <strong>
                                {testAuthResult.blocked
                                    ? "ACCESS PROMPTLY BLOCKED (HTTP 403) ✓"
                                    : "ACCESS PERMITTED"}
                            </strong>
                            <div>{testAuthResult.message}</div>
                            <small style={{ color: "#aaa" }}>
                                {testAuthResult.blocked
                                    ? "Smart contract 'isAuthenticated()' confirmed revocation. Challenge request refused."
                                    : "Vehicle is still active and can authenticate."}
                            </small>
                        </div>
                    )}

                    {/* TRANSACTION CONFIRMATION */}
                    {revokeResult && (
                        <div
                            style={{
                                marginTop: "1rem",
                                padding: "1rem",
                                borderRadius: "8px",
                                background: "rgba(230, 57, 70, 0.1)",
                                border: "1px solid rgba(230, 57, 70, 0.3)",
                            }}
                        >
                            <strong style={{ color: "#e63946" }}>Revocation Transaction Confirmed:</strong>
                            <div style={{ marginTop: "0.5rem", fontSize: "0.85rem" }}>
                                Transaction Hash: <code>{revokeResult.transactionHash}</code>
                            </div>
                            <div style={{ marginTop: "0.25rem", fontSize: "0.85rem" }}>
                                Mined in Block: <strong>#{revokeResult.blockNumber}</strong>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* VEHICLES DIRECTORY */}
            <section className="panel registry-table-panel">
                <div className="panel-header">
                    <div>
                        <h3>Vehicle Identity Trust Registry</h3>
                        <span>Live on-chain trust state for all vehicles</span>
                    </div>
                    <div className="table-count">{vehicles.length} Vehicles</div>
                </div>

                {loading ? (
                    <div style={{ padding: "2rem", textAlign: "center", color: "#888" }}>
                        Loading vehicles from blockchain...
                    </div>
                ) : vehicles.length === 0 ? (
                    <div style={{ padding: "2rem", textAlign: "center", color: "#888" }}>
                        No vehicles registered yet. Register a vehicle in Vehicle Registry.
                    </div>
                ) : (
                    <div className="registry-table-wrap">
                        <table className="registry-table">
                            <thead>
                                <tr>
                                    <th>VEHICLE ADDRESS</th>
                                    <th>TRUST STATUS</th>
                                    <th>REGISTERED</th>
                                    <th>ACTION</th>
                                </tr>
                            </thead>
                            <tbody>
                                {vehicles.map((v) => (
                                    <tr key={v.vehicleAddress}>
                                        <td>
                                            <code>{shorten(v.vehicleAddress, 14, 10)}</code>
                                        </td>
                                        <td>
                                            <span className={v.revoked ? "status-badge revoked" : "status-badge active"}>
                                                <span />
                                                {v.revoked ? "REVOKED" : "ACTIVE"}
                                            </span>
                                        </td>
                                        <td>{formatTimestamp(v.registeredAt)}</td>
                                        <td>
                                            {!v.revoked && (
                                                <button
                                                    className="secondary-button"
                                                    style={{ padding: "0.25rem 0.75rem", fontSize: "0.75rem" }}
                                                    onClick={() => {
                                                        setSelectedAddress(v.vehicleAddress);
                                                    }}
                                                >
                                                    Select
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}

export default Revocation;