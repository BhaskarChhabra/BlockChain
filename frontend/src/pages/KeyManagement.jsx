import { useEffect, useState } from "react";
import { getVehicles, getRSUs } from "../services/api";

function shorten(value, start = 12, end = 8) {
    if (!value) return "—";
    if (value.length <= start + end + 3) return value;
    return value.slice(0, start) + "..." + value.slice(-end);
}

function formatTimestamp(timestamp) {
    if (!timestamp) return "—";
    return new Date(timestamp * 1000).toLocaleString();
}

function KeyManagement() {
    const [vehicles, setVehicles] = useState([]);
    const [rsus, setRsus] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedEntity, setSelectedEntity] = useState(null);
    const [filterType, setFilterType] = useState("all"); // 'all' | 'vehicle' | 'rsu'
    const [copiedField, setCopiedField] = useState("");

    useEffect(() => {
        loadKeyData();
    }, []);

    async function loadKeyData() {
        try {
            setLoading(true);
            setError("");

            const [vData, rData] = await Promise.all([
                getVehicles(),
                getRSUs(),
            ]);

            const vList = (vData.vehicles || []).map((v) => ({
                id: v.vehicleAddress,
                name: v.name || `Vehicle ${shorten(v.vehicleAddress, 6, 4)}`,
                type: "Vehicle",
                address: v.vehicleAddress,
                publicKeyHash: v.publicKeyHash || "—",
                registered: v.registered,
                status: v.revoked ? "Revoked" : v.registered ? "Active" : "Unavailable",
                registeredAt: v.registeredAt,
                blockNumber: v.blockNumber,
                transactionHash: v.transactionHash,
                algorithm: "ECDSA secp256k1 (Keccak-256)",
            }));

            const rList = (rData.rsus || []).map((r) => ({
                id: r.id,
                name: `${r.id} (${r.location})`,
                type: "RSU",
                address: r.rsuAddress,
                publicKeyHash: "On-Chain Anchor (RSU Address)",
                registered: true,
                status: r.active ? "Active" : "Inactive",
                registeredAt: r.registeredAt,
                blockNumber: null,
                transactionHash: null,
                algorithm: "ECDSA secp256k1 (Keccak-256)",
                location: r.location,
            }));

            setVehicles(vList);
            setRsus(rList);

            const combined = [...vList, ...rList];
            if (combined.length > 0) {
                setSelectedEntity(combined[0]);
            }
        } catch (err) {
            setError(err.message || "Failed to load cryptographic key inventory");
        } finally {
            setLoading(false);
        }
    }

    function handleCopy(text, fieldName) {
        if (!text || text === "—") return;
        navigator.clipboard.writeText(text);
        setCopiedField(fieldName);
        setTimeout(() => setCopiedField(""), 2000);
    }

    const allEntities = [
        ...vehicles.map((v) => ({ ...v, category: "vehicle" })),
        ...rsus.map((r) => ({ ...r, category: "rsu" })),
    ];

    const filteredEntities = allEntities.filter((item) => {
        if (filterType === "all") return true;
        if (filterType === "vehicle") return item.category === "vehicle";
        if (filterType === "rsu") return item.category === "rsu";
        return true;
    });

    return (
        <div className="page-content">
            <div className="page-intro">
                <span className="eyebrow">VANET CRYPTOGRAPHIC INFRASTRUCTURE</span>
                <h2>Key Management Dashboard</h2>
                <p>
                    Inspect and verify the cryptographic public-key inventory and identity anchors registered across the V-CHAIN network.
                    All keys adhere to ECDSA secp256k1 standard curves with zero on-chain private key exposure.
                </p>
            </div>

            {error && (
                <div className="alert alert-error">
                    <strong>Inventory Error:</strong>
                    <span>{error}</span>
                </div>
            )}

            {/* KEY INVENTORY OVERVIEW SUMMARY CARDS */}
            <div className="stat-grid" style={{ marginBottom: "1.5rem" }}>
                <div className="stat-card">
                    <div className="stat-icon">🔑</div>
                    <div className="stat-body">
                        <span>TOTAL REGISTERED KEYS</span>
                        <strong>{loading ? "..." : allEntities.length}</strong>
                        <small>Public Identity Anchors</small>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">🚗</div>
                    <div className="stat-body">
                        <span>VEHICLE PUBLIC KEYS</span>
                        <strong>{loading ? "..." : vehicles.length}</strong>
                        <small>{vehicles.filter((v) => v.status === "Active").length} Active Keys</small>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">📡</div>
                    <div className="stat-body">
                        <span>RSU PUBLIC KEYS</span>
                        <strong>{loading ? "..." : rsus.length}</strong>
                        <small>{rsus.filter((r) => r.status === "Active").length} Active Nodes</small>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">🛡️</div>
                    <div className="stat-body">
                        <span>CIPHER SUITE</span>
                        <strong style={{ fontSize: "16px" }}>secp256k1</strong>
                        <small>ECDSA + Keccak-256</small>
                    </div>
                </div>
            </div>

            {/* MAIN TWO-COLUMN WORKSPACE: INVENTORY TABLE & DETAIL CARD */}
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) minmax(340px, 0.8fr)", gap: "1.5rem", alignItems: "start" }}>
                {/* LEFT COLUMN: FILTERABLE KEY INVENTORY TABLE */}
                <section className="panel registry-table-panel">
                    <div className="panel-header" style={{ flexWrap: "wrap", gap: "0.75rem" }}>
                        <div>
                            <h3>Registered Key Inventory</h3>
                            <span>Dynamically retrieved from smart contract state</span>
                        </div>

                        {/* Filter Tabs */}
                        <div style={{ display: "flex", gap: "6px" }}>
                            <button
                                className={`secondary-button ${filterType === "all" ? "active" : ""}`}
                                style={{
                                    padding: "4px 10px",
                                    fontSize: "11px",
                                    background: filterType === "all" ? "#3a86ff" : "transparent",
                                    borderColor: filterType === "all" ? "#3a86ff" : "#2a3644",
                                    color: filterType === "all" ? "#fff" : "#888",
                                }}
                                onClick={() => setFilterType("all")}
                            >
                                All ({allEntities.length})
                            </button>
                            <button
                                className={`secondary-button ${filterType === "vehicle" ? "active" : ""}`}
                                style={{
                                    padding: "4px 10px",
                                    fontSize: "11px",
                                    background: filterType === "vehicle" ? "#3a86ff" : "transparent",
                                    borderColor: filterType === "vehicle" ? "#3a86ff" : "#2a3644",
                                    color: filterType === "vehicle" ? "#fff" : "#888",
                                }}
                                onClick={() => setFilterType("vehicle")}
                            >
                                Vehicles ({vehicles.length})
                            </button>
                            <button
                                className={`secondary-button ${filterType === "rsu" ? "active" : ""}`}
                                style={{
                                    padding: "4px 10px",
                                    fontSize: "11px",
                                    background: filterType === "rsu" ? "#3a86ff" : "transparent",
                                    borderColor: filterType === "rsu" ? "#3a86ff" : "#2a3644",
                                    color: filterType === "rsu" ? "#fff" : "#888",
                                }}
                                onClick={() => setFilterType("rsu")}
                            >
                                RSUs ({rsus.length})
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div style={{ padding: "2rem", textAlign: "center", color: "#888" }}>
                            Loading cryptographic key records from blockchain...
                        </div>
                    ) : filteredEntities.length === 0 ? (
                        <div style={{ padding: "2rem", textAlign: "center", color: "#888" }}>
                            No key records found for the selected category.
                        </div>
                    ) : (
                        <div className="registry-table-wrap">
                            <table className="registry-table compact-table" style={{ width: "100%", tableLayout: "auto" }}>
                                <thead>
                                    <tr>
                                        <th>TYPE</th>
                                        <th>NAME &amp; ADDRESS</th>
                                        <th>KEY HASH</th>
                                        <th>STATUS</th>
                                        <th>ACTION</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredEntities.map((entity) => {
                                        const isSelected = selectedEntity?.id === entity.id;
                                        return (
                                            <tr
                                                key={entity.id}
                                                style={{
                                                    background: isSelected ? "rgba(58, 134, 255, 0.08)" : "transparent",
                                                    cursor: "pointer",
                                                }}
                                                onClick={() => setSelectedEntity(entity)}
                                            >
                                                <td>
                                                    <span
                                                        style={{
                                                            padding: "2px 8px",
                                                            borderRadius: "4px",
                                                            fontSize: "10px",
                                                            fontWeight: "bold",
                                                            background: entity.type === "Vehicle" ? "rgba(58, 134, 255, 0.15)" : "rgba(6, 214, 160, 0.15)",
                                                            color: entity.type === "Vehicle" ? "#3a86ff" : "#06d6a0",
                                                            whiteSpace: "nowrap",
                                                        }}
                                                    >
                                                        {entity.type === "Vehicle" ? "🚗 VEHICLE" : "📡 RSU"}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div style={{ fontWeight: "bold", color: "#e5eaf1", fontSize: "13px" }}>
                                                        {entity.name}
                                                    </div>
                                                    <code style={{ fontSize: "11px", color: "#888" }}>
                                                        {shorten(entity.address, 10, 8)}
                                                    </code>
                                                </td>
                                                <td>
                                                    <code style={{ fontSize: "11px" }}>
                                                        {shorten(entity.publicKeyHash, 8, 6)}
                                                    </code>
                                                </td>
                                                <td>
                                                    <span
                                                        className={`status-badge ${
                                                            entity.status === "Active"
                                                                ? "active"
                                                                : entity.status === "Revoked"
                                                                ? "revoked"
                                                                : "inactive"
                                                        }`}
                                                    >
                                                        <span />
                                                        {entity.status.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td>
                                                    <button
                                                        className="secondary-button"
                                                        style={{ padding: "4px 8px", fontSize: "10px", whiteSpace: "nowrap" }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedEntity(entity);
                                                        }}
                                                    >
                                                        {isSelected ? "Inspecting" : "Inspect"}
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                {/* RIGHT COLUMN: SELECTED ENTITY KEY DETAILS & STATUS */}
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                    <section className="panel">
                        <div className="panel-header">
                            <div>
                                <h3>Cryptographic Key Details</h3>
                                <span>Selected identity attributes &amp; proof parameters</span>
                            </div>
                            {selectedEntity && (
                                <span
                                    className={`status-badge ${
                                        selectedEntity.status === "Active"
                                            ? "active"
                                            : selectedEntity.status === "Revoked"
                                            ? "revoked"
                                            : "inactive"
                                    }`}
                                >
                                    <span />
                                    {selectedEntity.status.toUpperCase()}
                                </span>
                            )}
                        </div>

                        {selectedEntity ? (
                            <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "10px", borderBottom: "1px solid #1f2937" }}>
                                    <span style={{ fontSize: "12px", color: "#888" }}>Entity Name / Type</span>
                                    <div style={{ textAlign: "right" }}>
                                        <strong style={{ fontSize: "14px", color: "#fff" }}>{selectedEntity.name}</strong>
                                        <div style={{ fontSize: "11px", color: "#3a86ff" }}>{selectedEntity.type} Node</div>
                                    </div>
                                </div>

                                {/* Full Address Box */}
                                <div style={{ padding: "10px 12px", background: "#080d13", borderRadius: "8px", border: "1px solid #202b36" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                                        <span style={{ fontSize: "11px", color: "#888", fontWeight: "bold" }}>ETHEREUM ADDRESS</span>
                                        <button
                                            className="secondary-button"
                                            style={{ padding: "3px 8px", fontSize: "11px" }}
                                            onClick={() => handleCopy(selectedEntity.address, "address")}
                                        >
                                            {copiedField === "address" ? "✓ Copied" : "📋 Copy"}
                                        </button>
                                    </div>
                                    <code style={{ fontSize: "12px", wordBreak: "break-all", color: "#8cf2bf", display: "block" }}>
                                        {selectedEntity.address}
                                    </code>
                                </div>

                                {/* Public Key Hash Box */}
                                <div style={{ padding: "10px 12px", background: "#080d13", borderRadius: "8px", border: "1px solid #202b36" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                                        <span style={{ fontSize: "11px", color: "#888", fontWeight: "bold" }}>PUBLIC KEY HASH</span>
                                        <button
                                            className="secondary-button"
                                            style={{ padding: "3px 8px", fontSize: "11px" }}
                                            onClick={() => handleCopy(selectedEntity.publicKeyHash, "pubkey")}
                                        >
                                            {copiedField === "pubkey" ? "✓ Copied" : "📋 Copy"}
                                        </button>
                                    </div>
                                    <code style={{ fontSize: "12px", wordBreak: "break-all", color: "#a5b4fc", display: "block" }}>
                                        {selectedEntity.publicKeyHash}
                                    </code>
                                </div>

                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", padding: "6px 0", borderBottom: "1px solid #1a222d" }}>
                                    <span style={{ color: "#888" }}>Asymmetric Algorithm:</span>
                                    <span style={{ color: "#e5eaf1", fontFamily: "monospace" }}>{selectedEntity.algorithm}</span>
                                </div>

                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", padding: "6px 0", borderBottom: "1px solid #1a222d" }}>
                                    <span style={{ color: "#888" }}>Registration Timestamp:</span>
                                    <span style={{ color: "#ccc" }}>{formatTimestamp(selectedEntity.registeredAt)}</span>
                                </div>

                                {selectedEntity.blockNumber && (
                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", padding: "6px 0", borderBottom: "1px solid #1a222d" }}>
                                        <span style={{ color: "#888" }}>Mining Block:</span>
                                        <span style={{ color: "#48e6aa", fontFamily: "monospace" }}>Block #{selectedEntity.blockNumber}</span>
                                    </div>
                                )}

                                <div style={{ padding: "10px", borderRadius: "6px", background: "rgba(72, 230, 170, 0.05)", border: "1px solid rgba(72, 230, 170, 0.15)", fontSize: "11px", color: "#8cf2bf", lineHeight: "1.5" }}>
                                    🛡️ <strong>Zero-Knowledge Key Storage:</strong> Only cryptographic public identity hashes are stored on the public blockchain. Private keys remain strictly held in vehicle OBU / RSU secure hardware elements.
                                </div>
                            </div>
                        ) : (
                            <div style={{ padding: "2rem", textAlign: "center", color: "#888" }}>
                                Select an entity from the inventory table to inspect its cryptographic keys.
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
}

export default KeyManagement;
