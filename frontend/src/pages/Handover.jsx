import { formatVehicleOption } from "../utils/vehicleFormat";
import { useEffect, useState } from "react";
import {
    getVehicles,
    getRSUs,
    executeHandover,
    getLastHandover,
    getHandoverHistory,
    registerVehicle,
} from "../services/api";
import {
    getVehicleIdentity,
    createVehicleIdentity,
    signVehicleMessage,
} from "../services/vehicleIdentity";

function shorten(value, start = 12, end = 8) {
    if (!value) return "—";
    if (value.length <= start + end + 3) return value;
    return value.slice(0, start) + "..." + value.slice(-end);
}

function formatTime(timestamp) {
    if (!timestamp) return "—";
    return new Date(timestamp * 1000).toLocaleString();
}

function Handover() {
    const [vehicles, setVehicles] = useState([]);
    const [rsus, setRsus] = useState([]);
    const [handoverHistory, setHandoverHistory] = useState([]);

    const [vehicleAddress, setVehicleAddress] = useState("");
    const [currentRsuId, setCurrentRsuId] = useState("");
    const [targetRsuId, setTargetRsuId] = useState("");

    const [loading, setLoading] = useState(true);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [enrollingLocal, setEnrollingLocal] = useState(false);
    const [handoverResult, setHandoverResult] = useState(null);
    const [lastHandover, setLastHandover] = useState(null);

    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [copiedHash, setCopiedHash] = useState("");

    useEffect(() => {
        loadData();
        loadHistory();
    }, []);

    async function loadData() {
        try {
            setLoading(true);
            setError("");

            const [vData, rData] = await Promise.all([
                getVehicles(),
                getRSUs(),
            ]);

            const allVehicles = vData.vehicles || [];
            const activeRsus = (rData.rsus || []).filter((r) => r.active);

            setVehicles(allVehicles);
            setRsus(activeRsus);

            const activeVehicles = allVehicles.filter((v) => v.registered && !v.revoked);

            // Check if local identity matches any active vehicle
            const localId = getVehicleIdentity();
            const matchingLocal = localId && activeVehicles.find(
                (v) => v.vehicleAddress.toLowerCase() === localId.address.toLowerCase()
            );

            if (matchingLocal) {
                setVehicleAddress(matchingLocal.vehicleAddress);
            } else if (activeVehicles.length > 0) {
                setVehicleAddress(activeVehicles[0].vehicleAddress);
            }

            if (activeRsus.length >= 2) {
                setCurrentRsuId(activeRsus[0].id);
                setTargetRsuId(activeRsus[1].id);
            } else if (activeRsus.length === 1) {
                setCurrentRsuId(activeRsus[0].id);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function loadHistory() {
        try {
            setHistoryLoading(true);
            const data = await getHandoverHistory();
            setHandoverHistory(data.handovers || []);
        } catch (err) {
            console.error("Failed to load handover history:", err);
        } finally {
            setHistoryLoading(false);
        }
    }

    useEffect(() => {
        if (!vehicleAddress) return;
        loadLastHandover(vehicleAddress);
    }, [vehicleAddress]);

    async function loadLastHandover(address) {
        try {
            const res = await getLastHandover(address);
            setLastHandover(res);
            if (res?.successful && res.rsuId) {
                setCurrentRsuId(res.rsuId);
            }
        } catch {
            setLastHandover(null);
        }
    }

    // Helper to generate & enroll local vehicle if needed
    async function handleEnrollLocalVehicle() {
        try {
            setEnrollingLocal(true);
            setError("");
            const newId = createVehicleIdentity();
            await registerVehicle(newId.address, newId.publicKeyHash);
            await loadData();
            setVehicleAddress(newId.address);
            setMessage(`Enrolled local vehicle ${shorten(newId.address)} on blockchain.`);
        } catch (err) {
            setError(`Auto-enroll failed: ${err.message}`);
        } finally {
            setEnrollingLocal(false);
        }
    }

    async function handleExecuteHandover() {
        try {
            setError("");
            setMessage("");
            setHandoverResult(null);

            if (!vehicleAddress) {
                throw new Error("Select an active vehicle.");
            }

            const selectedVehicleObj = vehicles.find(
                (v) => v.vehicleAddress.toLowerCase() === vehicleAddress.toLowerCase()
            );

            if (selectedVehicleObj && selectedVehicleObj.revoked) {
                throw new Error("Selected vehicle is revoked on the blockchain. Handover rejected.");
            }

            if (!targetRsuId) {
                throw new Error("Select a target destination RSU.");
            }

            if (currentRsuId === targetRsuId) {
                throw new Error("Target destination RSU must be different from the source serving RSU.");
            }

            const identity = getVehicleIdentity();
            if (
                !identity ||
                identity.address.toLowerCase() !== vehicleAddress.toLowerCase()
            ) {
                throw new Error(
                    "Selected vehicle does not match the local OBU wallet private key. Cryptographic handover requires the vehicle's digital signature."
                );
            }

            setSubmitting(true);

            // Construct handover ticket authorization message
            const handoverMessage =
                `V-CHAIN HANDOVER\n` +
                `Vehicle: ${vehicleAddress}\n` +
                `From: ${currentRsuId || "None"}\n` +
                `To: ${targetRsuId}`;

            // Vehicle cryptographically signs handover authorization ticket
            const signature = await signVehicleMessage(handoverMessage);

            // Submit to backend
            const result = await executeHandover(
                vehicleAddress,
                currentRsuId,
                targetRsuId,
                signature,
                handoverMessage
            );

            setHandoverResult(result);
            setMessage(`Handover from ${currentRsuId || "Source"} to ${targetRsuId} successfully committed on blockchain!`);

            // Update current RSU to new target and refresh history
            setCurrentRsuId(targetRsuId);
            await Promise.all([
                loadLastHandover(vehicleAddress),
                loadHistory(),
            ]);
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    }

    function handleCopyHash(hash) {
        if (!hash) return;
        navigator.clipboard.writeText(hash);
        setCopiedHash(hash);
        setTimeout(() => setCopiedHash(""), 2000);
    }

    const currentRsuObj = rsus.find((r) => r.id === currentRsuId);
    const targetRsuObj = rsus.find((r) => r.id === targetRsuId);
    const selectedVehicleObj = vehicles.find(
        (v) => v.vehicleAddress.toLowerCase() === (vehicleAddress || "").toLowerCase()
    );
    const localIdentity = getVehicleIdentity();
    const hasLocalPrivateKey =
        localIdentity &&
        selectedVehicleObj &&
        localIdentity.address.toLowerCase() === selectedVehicleObj.vehicleAddress.toLowerCase();

    return (
        <div className="page-content">
            <div className="page-intro">
                <span className="eyebrow">VANET MOBILITY MANAGEMENT &amp; SESSION CONTINUITY</span>
                <h2>RSU Handover Protocol</h2>
                <p>
                    Execute seamless and secure vehicle transitions between Roadside Units as the vehicle travels along the VANET corridor.
                    The vehicle generates an ECDSA signed handover ticket to authorize its session transfer across roadside infrastructure.
                </p>
            </div>

            {error && (
                <div className="alert alert-error">
                    <strong>Handover Error:</strong>
                    <span>{error}</span>
                </div>
            )}

            {message && !error && (
                <div className="alert alert-success">
                    <strong>Handover Confirmed:</strong>
                    <span>{message}</span>
                </div>
            )}

            {/* THREE-STAGE HANDOVER WORKFLOW PANEL */}
            <section className="panel">
                <div className="panel-header">
                    <div>
                        <h3>3-Stage Handover Execution Protocol</h3>
                        <span>Follow the sequence: Vehicle Verification ➔ RSU Routing ➔ Cryptographic Authorization</span>
                    </div>
                    <span className="module-tag">SECURE MOBILITY</span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr 1fr", gap: "1.25rem", marginTop: "1rem" }}>
                    {/* ========================================================
                        STAGE 1: SELECT VEHICLE
                    ======================================================== */}
                    <div style={{ padding: "1.2rem", background: "#080d13", border: "1px solid #202a35", borderRadius: "10px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                        <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                                <span style={{ background: "#3a86ff", color: "#fff", width: "22px", height: "22px", borderRadius: "50%", display: "grid", placeItems: "center", fontSize: "12px", fontWeight: "bold" }}>
                                    1
                                </span>
                                <strong style={{ fontSize: "13px", color: "#e5eaf1" }}>SELECT VEHICLE</strong>
                            </div>

                            <label style={{ fontSize: "11px", color: "#888", display: "block", marginBottom: "6px" }}>
                                REGISTERED ON-CHAIN IDENTITY
                            </label>
                            <select
                                className="dark-dropdown"
                                value={vehicleAddress}
                                onChange={(e) => setVehicleAddress(e.target.value)}
                                disabled={loading || vehicles.length === 0}
                                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #293440", background: "#0b1118", color: "#dce2eb", fontSize: "12px" }}
                            >
                                <option value="">Select active vehicle</option>
                                {vehicles.map((v) => (
                                    <option key={v.vehicleAddress} value={v.vehicleAddress}>
                                        {formatVehicleOption(v)}
                                    </option>
                                ))}
                            </select>

                            {selectedVehicleObj && (
                                <div style={{ marginTop: "1rem", fontSize: "11px", lineHeight: "1.6" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                        <span style={{ color: "#888" }}>Status:</span>
                                        <span className={`status-badge ${selectedVehicleObj.revoked ? "revoked" : "active"}`} style={{ padding: "1px 6px" }}>
                                            <span />
                                            {selectedVehicleObj.revoked ? "REVOKED (BLOCKED)" : "ACTIVE ✓"}
                                        </span>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                        <span style={{ color: "#888" }}>Local Keypair:</span>
                                        <span style={{ color: hasLocalPrivateKey ? "#06d6a0" : "#ffb703" }}>
                                            {hasLocalPrivateKey ? "OBU Key Available ✓" : "Key Not in Local Storage"}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {!hasLocalPrivateKey && (
                            <div style={{ marginTop: "1rem" }}>
                                <button
                                    className="secondary-button"
                                    onClick={handleEnrollLocalVehicle}
                                    disabled={enrollingLocal}
                                    style={{ width: "100%", fontSize: "11px", padding: "6px" }}
                                >
                                    {enrollingLocal ? "Enrolling..." : "+ Enroll Local Vehicle for Demo"}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* ========================================================
                        STAGE 2: ROUTING & RSU CONFIGURATION
                    ======================================================== */}
                    <div style={{ padding: "1.2rem", background: "#080d13", border: "1px solid #202a35", borderRadius: "10px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                            <span style={{ background: "#3a86ff", color: "#fff", width: "22px", height: "22px", borderRadius: "50%", display: "grid", placeItems: "center", fontSize: "12px", fontWeight: "bold" }}>
                                2
                            </span>
                            <strong style={{ fontSize: "13px", color: "#e5eaf1" }}>RSU ROUTING PATH</strong>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: "8px", alignItems: "center", marginTop: "10px" }}>
                            {/* SOURCE RSU */}
                            <div style={{ padding: "10px", background: "rgba(255, 255, 255, 0.02)", borderRadius: "8px", border: "1px solid #293440" }}>
                                <span style={{ fontSize: "10px", color: "#888", display: "block" }}>SOURCE RSU</span>
                                <select
                                    value={currentRsuId}
                                    onChange={(e) => setCurrentRsuId(e.target.value)}
                                    disabled={loading || rsus.length === 0}
                                    style={{ width: "100%", marginTop: "6px", padding: "6px", background: "#0b1118", border: "1px solid #293440", color: "#fff", fontSize: "11px", borderRadius: "6px" }}
                                >
                                    <option value="">Source RSU</option>
                                    {rsus.map((r) => (
                                        <option key={r.id} value={r.id}>
                                            {r.id}
                                        </option>
                                    ))}
                                </select>
                                {currentRsuObj && (
                                    <div style={{ fontSize: "10px", color: "#888", marginTop: "4px" }}>
                                        {currentRsuObj.location}
                                    </div>
                                )}
                            </div>

                            {/* DIRECTION ARROW */}
                            <div style={{ fontSize: "18px", color: "#3a86ff", fontWeight: "bold" }}>➔</div>

                            {/* TARGET RSU */}
                            <div style={{ padding: "10px", background: "rgba(255, 255, 255, 0.02)", borderRadius: "8px", border: "1px solid #293440" }}>
                                <span style={{ fontSize: "10px", color: "#06d6a0", display: "block" }}>DESTINATION RSU</span>
                                <select
                                    value={targetRsuId}
                                    onChange={(e) => setTargetRsuId(e.target.value)}
                                    disabled={loading || rsus.length === 0}
                                    style={{ width: "100%", marginTop: "6px", padding: "6px", background: "#0b1118", border: "1px solid #293440", color: "#fff", fontSize: "11px", borderRadius: "6px" }}
                                >
                                    <option value="">Target RSU</option>
                                    {rsus.map((r) => (
                                        <option key={r.id} value={r.id}>
                                            {r.id}
                                        </option>
                                    ))}
                                </select>
                                {targetRsuObj && (
                                    <div style={{ fontSize: "10px", color: "#06d6a0", marginTop: "4px" }}>
                                        {targetRsuObj.location}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Mobility Corridor Visualizer */}
                        <div style={{ marginTop: "1rem", padding: "8px 12px", background: "rgba(58, 134, 255, 0.05)", borderRadius: "6px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px" }}>
                            <span>Corridor Transit:</span>
                            <span style={{ color: "#3a86ff", fontWeight: "bold" }}>
                                {currentRsuId || "Source"} ➔ {targetRsuId || "Target"}
                            </span>
                        </div>
                    </div>

                    {/* ========================================================
                        STAGE 3: AUTHORIZATION & COMMIT
                    ======================================================== */}
                    <div style={{ padding: "1.2rem", background: "#080d13", border: "1px solid #202a35", borderRadius: "10px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                        <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                                <span style={{ background: "#3a86ff", color: "#fff", width: "22px", height: "22px", borderRadius: "50%", display: "grid", placeItems: "center", fontSize: "12px", fontWeight: "bold" }}>
                                    3
                                </span>
                                <strong style={{ fontSize: "13px", color: "#e5eaf1" }}>AUTHORIZE HANDOVER</strong>
                            </div>

                            <div style={{ fontSize: "11px", color: "#aaa", lineHeight: "1.5", marginTop: "8px" }}>
                                <div>Vehicle: <code>{shorten(vehicleAddress, 8, 6)}</code></div>
                                <div>Transfer: <strong>{currentRsuId || "Source"}</strong> ➔ <strong>{targetRsuId || "Target"}</strong></div>
                                <div>Security: <span>ECDSA Ticket Signature</span></div>
                            </div>
                        </div>

                        <div style={{ marginTop: "1rem" }}>
                            <button
                                className="primary-button"
                                onClick={handleExecuteHandover}
                                disabled={
                                    submitting ||
                                    !vehicleAddress ||
                                    !targetRsuId ||
                                    currentRsuId === targetRsuId ||
                                    selectedVehicleObj?.revoked
                                }
                                style={{ width: "100%", padding: "10px", fontSize: "12px" }}
                            >
                                {submitting ? "Signing & Committing..." : "Authorize & Execute Handover"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* TRANSACTION SUCCESS BANNER */}
                {handoverResult && (
                    <div className="protocol-result success" style={{ marginTop: "1.5rem" }}>
                        <div className="result-symbol">✓</div>
                        <div style={{ flex: 1 }}>
                            <strong style={{ fontSize: "14px" }}>
                                HANDOVER COMMITTED TO SMART CONTRACT: {handoverResult.fromRsu} ➔ {handoverResult.toRsu}
                            </strong>
                            <div style={{ fontSize: "12px", marginTop: "0.3rem" }}>
                                Transitioned vehicle <code>{shorten(handoverResult.vehicleAddress, 16, 12)}</code>. Session ownership updated in <code>AuthRegistry.sol</code>.
                            </div>
                            <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginTop: "0.5rem", fontSize: "11px", color: "#aaa" }}>
                                <span>Mined in Block #{handoverResult.blockNumber}</span>
                                <span>Tx: <code>{shorten(handoverResult.transactionHash, 14, 10)}</code></span>
                                <button
                                    className="secondary-button"
                                    onClick={() => handleCopyHash(handoverResult.transactionHash)}
                                    style={{ padding: "2px 8px", fontSize: "10px" }}
                                >
                                    {copiedHash === handoverResult.transactionHash ? "Copied!" : "Copy Tx Hash"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </section>

            {/* HANDOVER AUDIT TRAIL / HISTORY TABLE */}
            <section className="panel registry-table-panel" style={{ marginTop: "1.5rem" }}>
                <div className="panel-header">
                    <div>
                        <h3>Handover Audit History</h3>
                        <span>Immutable mobility records retrieved from blockchain HandoverRecorded events</span>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                        <div className="table-count">{handoverHistory.length} handovers recorded</div>
                        <button
                            className="secondary-button"
                            onClick={loadHistory}
                            disabled={historyLoading}
                            style={{ padding: "4px 10px", fontSize: "11px" }}
                        >
                            {historyLoading ? "Refreshing..." : "↻ Refresh History"}
                        </button>
                    </div>
                </div>

                {historyLoading ? (
                    <div style={{ padding: "2rem", textAlign: "center", color: "#888" }}>
                        Loading on-chain handover events...
                    </div>
                ) : handoverHistory.length === 0 ? (
                    <div style={{ padding: "2rem", textAlign: "center", color: "#888" }}>
                        No handover transitions recorded on blockchain yet. Perform a handover above to record the first event.
                    </div>
                ) : (
                    <div className="registry-table-wrap">
                        <table className="registry-table">
                            <thead>
                                <tr>
                                    <th>VEHICLE ADDRESS</th>
                                    <th>DESTINATION RSU</th>
                                    <th>TIMESTAMP</th>
                                    <th>MINED BLOCK</th>
                                    <th>TRANSACTION HASH</th>
                                    <th>STATUS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {handoverHistory.map((item, idx) => (
                                    <tr key={item.transactionHash + "-" + idx}>
                                        <td>
                                            <code>{shorten(item.vehicleAddress, 10, 8)}</code>
                                        </td>
                                        <td>
                                            <span style={{ fontWeight: "bold", color: "#06d6a0" }}>
                                                {item.targetRsuId}
                                            </span>
                                        </td>
                                        <td>
                                            <span style={{ fontSize: "11px", color: "#aaa" }}>
                                                {formatTime(item.timestamp)}
                                            </span>
                                        </td>
                                        <td>
                                            <code>#{item.blockNumber}</code>
                                        </td>
                                        <td>
                                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                                <code>{shorten(item.transactionHash, 10, 6)}</code>
                                                <button
                                                    className="secondary-button"
                                                    style={{ padding: "2px 6px", fontSize: "10px" }}
                                                    onClick={() => handleCopyHash(item.transactionHash)}
                                                >
                                                    {copiedHash === item.transactionHash ? "✓" : "Copy"}
                                                </button>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="status-badge active">
                                                <span />
                                                CONFIRMED ON-CHAIN ✓
                                            </span>
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

export default Handover;
