import { useEffect, useState } from "react";
import { getDashboardStats } from "../services/api";

function shorten(value, start = 12, end = 8) {
    if (!value) return "—";
    if (value.length <= start + end + 3) return value;
    return value.slice(0, start) + "..." + value.slice(-end);
}

function Overview({ setPage }) {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        loadStats();
    }, []);

    async function loadStats() {
        try {
            setLoading(true);
            setError("");
            const data = await getDashboardStats();
            setStats(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="page-content">
            <div className="page-intro">
                <span className="eyebrow">VANET TRUST INFRASTRUCTURE</span>
                <h2>
                    Blockchain-Powered
                    <br />
                    <span>Decentralized Mutual Authentication</span>
                </h2>
                <p>
                    Real-time Vehicle-to-Infrastructure (V2I) mutual identity verification,
                    cryptographic challenge-response, secure handover mobility, and on-chain revocation management.
                </p>
            </div>

            {error && (
                <div className="alert alert-error">
                    <strong>Dashboard Warning:</strong>
                    <span>Unable to connect to blockchain backend ({error}). Ensure local Hardhat node and backend are running.</span>
                </div>
            )}

            {/* LIVE BLOCKCHAIN STATS GRID */}
            <div className="stat-grid">
                {/* BLOCKCHAIN STATUS */}
                <div className="stat-card">
                    <div className="stat-icon">◇</div>
                    <div className="stat-body">
                        <span>BLOCKCHAIN STATUS</span>
                        <strong>
                            <span
                                className={
                                    stats?.blockchainConnected
                                        ? "status-dot active"
                                        : "status-dot"
                                }
                            />
                            {loading ? "CHECKING..." : stats?.blockchainConnected ? "ONLINE" : "OFFLINE"}
                        </strong>
                        <small>
                            {stats?.blockNumber !== undefined
                                ? `Block #${stats.blockNumber} (Hardhat 31337)`
                                : "Connecting..."}
                        </small>
                    </div>
                </div>

                {/* VEHICLES */}
                <div className="stat-card">
                    <div className="stat-icon">▣</div>
                    <div className="stat-body">
                        <span>VEHICLES</span>
                        <strong>{loading ? "..." : stats?.totalVehicles ?? "—"}</strong>
                        <small>
                            {stats
                                ? `${stats.activeVehicles} active / ${stats.revokedVehicles} revoked`
                                : "Registered identities"}
                        </small>
                    </div>
                </div>

                {/* RSUS */}
                <div className="stat-card">
                    <div className="stat-icon">📡</div>
                    <div className="stat-body">
                        <span>ROADSIDE UNITS</span>
                        <strong>{loading ? "..." : stats?.activeRSUs ?? "—"}</strong>
                        <small>
                            {stats ? `${stats.totalRSUs} deployed infrastructure nodes` : "Active RSUs"}
                        </small>
                    </div>
                </div>

                {/* AUTHENTICATIONS */}
                <div className="stat-card">
                    <div className="stat-icon">◈</div>
                    <div className="stat-body">
                        <span>MUTUAL AUTHS</span>
                        <strong>{loading ? "..." : stats?.totalAuthentications ?? "—"}</strong>
                        <small>On-chain verified sessions</small>
                    </div>
                </div>

                {/* HANDOVERS */}
                <div className="stat-card">
                    <div className="stat-icon">⇄</div>
                    <div className="stat-body">
                        <span>HANDOVERS</span>
                        <strong>{loading ? "..." : stats?.totalHandovers ?? "—"}</strong>
                        <small>Blockchain recorded transitions</small>
                    </div>
                </div>
            </div>

            {/* LIVE SYSTEM DETAILS */}
            <div className="panel" style={{ marginTop: "1.5rem" }}>
                <div className="panel-header">
                    <div>
                        <h3>V-CHAIN System Parameters</h3>
                        <span>Deployed Smart Contract &amp; Cryptographic Architecture</span>
                    </div>
                    <button
                        className="secondary-button"
                        style={{ padding: "0.25rem 0.75rem", fontSize: "0.75rem" }}
                        onClick={loadStats}
                    >
                        ↻ Refresh Live State
                    </button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", padding: "0.5rem 0" }}>
                    <div style={{ padding: "0.75rem", borderRadius: "6px", background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                        <span style={{ fontSize: "0.75rem", color: "#888", display: "block" }}>SMART CONTRACT ADDRESS</span>
                        <code style={{ fontSize: "0.85rem", color: "#00f0ff" }}>
                            {stats?.contractAddress || "Loading contract address..."}
                        </code>
                    </div>

                    <div style={{ padding: "0.75rem", borderRadius: "6px", background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                        <span style={{ fontSize: "0.75rem", color: "#888", display: "block" }}>CRYPTOGRAPHIC PROTOCOL</span>
                        <span style={{ fontSize: "0.85rem", fontWeight: "bold", color: "#fff" }}>
                            ECDSA secp256k1 Bidirectional Challenge-Response
                        </span>
                    </div>
                </div>
            </div>

            {/* MODULE LAUNCHER */}
            <div className="panel" style={{ marginTop: "1.5rem" }}>
                <div className="panel-header">
                    <div>
                        <h3>V-CHAIN Security Console</h3>
                        <span>Select a core capability to demonstrate</span>
                    </div>
                </div>

                <div className="module-launcher">
                    <button onClick={() => setPage("authentication")}>
                        <strong>◈ V2I Mutual Authentication</strong>
                        <span>Bidirectional vehicle &amp; RSU verification</span>
                    </button>

                    <button onClick={() => setPage("vehicles")}>
                        <strong>▣ Vehicle Registry</strong>
                        <span>Cryptographic keypair generation &amp; on-chain enrollment</span>
                    </button>

                    <button onClick={() => setPage("handover")}>
                        <strong>⇄ RSU Handover</strong>
                        <span>Signed vehicle mobility transitions between RSUs</span>
                    </button>

                    <button onClick={() => setPage("revocation")}>
                        <strong>⊘ Revocation Center</strong>
                        <span>On-chain identity revocation &amp; access cutoff</span>
                    </button>

                    <button onClick={() => setPage("keys")}>
                        <strong>🔑 Key Management</strong>
                        <span>Cryptographic public key inventory &amp; lifecycle</span>
                    </button>

                    <button onClick={() => setPage("attacks")}>
                        <strong>⚡ Attack Lab</strong>
                        <span>Live simulation of Sybil and signature forgery attacks</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Overview;