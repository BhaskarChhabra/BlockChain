import { useEffect, useState } from "react";
import {
    getVehicles,
    getRSUs,
    registerVehicle,
    registerRSU,
    deactivateVehicle,
    setRSUStatus,
} from "../services/api";
import {
    createVehicleIdentity,
    getVehicleIdentity,
    clearVehicleIdentity,
} from "../services/vehicleIdentity";

function shorten(value, start = 12, end = 8) {
    if (!value) return "—";
    if (value.length <= start + end + 3) return value;
    return value.slice(0, start) + "..." + value.slice(-end);
}

function formatTimestamp(timestamp) {
    if (!timestamp) return "—";
    return new Date(timestamp * 1000).toLocaleString();
}

function VehicleRegistry() {
    const [vehicles, setVehicles] = useState([]);
    const [rsus, setRsus] = useState([]);
    const [identity, setIdentity] = useState(null);

    const [vehicleName, setVehicleName] = useState("");
    const [registeringVehicle, setRegisteringVehicle] = useState(false);
    const [registeringRsu, setRegisteringRsu] = useState(false);

    const [rsuId, setRsuId] = useState("");
    const [rsuLocation, setRsuLocation] = useState("");

    const [vehicleResult, setVehicleResult] = useState(null);
    const [rsuResult, setRsuResult] = useState(null);

    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(true);

    // Modal Confirmation States
    const [vehicleToDeactivate, setVehicleToDeactivate] = useState(null);
    const [deactivatingVehicle, setDeactivatingVehicle] = useState(false);

    const [rsuToToggle, setRsuToToggle] = useState(null);
    const [togglingRsu, setTogglingRsu] = useState(false);

    // ========================================================
    // INITIAL LOAD
    // ========================================================

    useEffect(() => {
        const storedIdentity = getVehicleIdentity();
        setIdentity(storedIdentity);
        loadData();
    }, []);

    async function loadData() {
        try {
            setLoading(true);
            setError("");

            const [vehicleData, rsuData] = await Promise.all([
                getVehicles(),
                getRSUs(),
            ]);

            setVehicles(vehicleData.vehicles || []);
            setRsus(rsuData.rsus || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    // ========================================================
    // GENERATE VEHICLE IDENTITY
    // ========================================================

    function generateVehicle() {
        try {
            setError("");
            setMessage("");
            setVehicleResult(null);

            const newIdentity = createVehicleIdentity();
            setIdentity(newIdentity);
            setVehicleName(`Vehicle-${vehicles.length + 1}`);
        } catch (err) {
            setError(err.message);
        }
    }

    // ========================================================
    // REGISTER GENERATED VEHICLE
    // ========================================================

    async function handleVehicleRegistration() {
        try {
            setError("");
            setMessage("");
            setVehicleResult(null);

            const currentIdentity = getVehicleIdentity();

            if (!currentIdentity) {
                throw new Error("Generate a vehicle identity first.");
            }

            setRegisteringVehicle(true);

            const assignedName = vehicleName.trim() || `Vehicle-${vehicles.length + 1}`;

            const data = await registerVehicle(
                currentIdentity.address,
                currentIdentity.publicKeyHash,
                assignedName
            );

            setVehicleResult(data);
            setMessage(`Vehicle "${assignedName}" successfully enrolled on blockchain! Tx: ${shorten(data.transactionHash, 10, 6)}`);
            await loadData();
        } catch (err) {
            setError(err.message);
        } finally {
            setRegisteringVehicle(false);
        }
    }

    // ========================================================
    // DEACTIVATE VEHICLE (ADMIN ACTION)
    // ========================================================

    async function confirmDeactivateVehicle() {
        if (!vehicleToDeactivate) return;

        try {
            setDeactivatingVehicle(true);
            setError("");
            setMessage("");

            const res = await deactivateVehicle(
                vehicleToDeactivate.vehicleAddress,
                "Administrative Deactivation"
            );

            setMessage(
                `Vehicle "${vehicleToDeactivate.name || shorten(vehicleToDeactivate.vehicleAddress)}" successfully deactivated on blockchain. Mined in Block #${res.blockNumber}.`
            );

            setVehicleToDeactivate(null);
            await loadData();
        } catch (err) {
            setError(err.message);
        } finally {
            setDeactivatingVehicle(false);
        }
    }

    // ========================================================
    // TOGGLE RSU STATUS (ACTIVATE / DEACTIVATE)
    // ========================================================

    async function confirmToggleRsuStatus() {
        if (!rsuToToggle) return;

        try {
            setTogglingRsu(true);
            setError("");
            setMessage("");

            const res = await setRSUStatus(rsuToToggle.id, rsuToToggle.targetActive);

            setMessage(
                `RSU "${rsuToToggle.id}" successfully updated to ${rsuToToggle.targetActive ? "ACTIVE" : "INACTIVE"} on blockchain. Mined in Block #${res.blockNumber}.`
            );

            setRsuToToggle(null);
            await loadData();
        } catch (err) {
            setError(err.message);
        } finally {
            setTogglingRsu(false);
        }
    }

    // ========================================================
    // REGISTER RSU
    // ========================================================

    async function handleRsuRegistration(event) {
        event.preventDefault();

        try {
            setError("");
            setMessage("");
            setRsuResult(null);

            setRegisteringRsu(true);

            const data = await registerRSU(
                rsuId.trim(),
                rsuLocation.trim()
            );

            setRsuResult(data);
            setMessage(`RSU "${rsuId.trim()}" successfully registered on blockchain!`);
            setRsuId("");
            setRsuLocation("");

            await loadData();
        } catch (err) {
            setError(err.message);
        } finally {
            setRegisteringRsu(false);
        }
    }

    // ========================================================
    // REMOVE LOCAL IDENTITY
    // ========================================================

    function removeLocalIdentity() {
        clearVehicleIdentity();
        setIdentity(null);
        setVehicleResult(null);
        setVehicleName("");
    }

    return (
        <div className="page-content">
            <div className="page-intro">
                <span className="eyebrow">IDENTITY &amp; ROADSIDE INFRASTRUCTURE ENROLLMENT</span>
                <h2>Vehicle &amp; RSU Registry</h2>
                <p>
                    Provision cryptographic identities for vehicular On-Board Units (OBUs) and Roadside Units (RSUs).
                    All registered entities are immutably anchored to the <code>AuthRegistry.sol</code> smart contract.
                </p>
            </div>

            {error && (
                <div className="alert alert-error">
                    <strong>Registry Error:</strong>
                    <span>{error}</span>
                </div>
            )}

            {message && !error && (
                <div className="alert alert-success">
                    <strong>Transaction Confirmed:</strong>
                    <span>{message}</span>
                </div>
            )}

            {/* ==================================================
                VEHICLE ENROLLMENT
            ================================================== */}
            <section className="panel registry-panel">
                <div className="panel-header">
                    <div>
                        <h3>Vehicle Identity Provisioning</h3>
                        <span>Generate asymmetric secp256k1 keypair &amp; register on-chain</span>
                    </div>
                    <span className="module-tag">OBU ENROLLMENT</span>
                </div>

                {!identity ? (
                    <div className="identity-empty">
                        <div className="empty-icon">▣</div>
                        <h4>No Vehicle Identity Generated</h4>
                        <p>Generate a local cryptographic keypair to simulate an automotive On-Board Unit (OBU).</p>
                        <button className="primary-button" onClick={generateVehicle}>
                            Generate Vehicle Identity
                        </button>
                    </div>
                ) : (
                    <div className="identity-content">
                        <div className="identity-status">
                            <div className="identity-live-dot" />
                            <div>
                                <strong>VEHICLE IDENTITY READY</strong>
                                <span>Cryptographic material generated in local secure storage.</span>
                            </div>
                        </div>

                        {/* VEHICLE NAME INPUT */}
                        <div style={{ marginTop: "1rem", marginBottom: "1rem", maxWidth: "420px" }}>
                            <label style={{ display: "block", fontSize: "11px", color: "#888", fontWeight: "bold", marginBottom: "6px" }}>
                                VEHICLE NAME / CALLSIGN (e.g. Vehicle-01, Ambulance-01)
                            </label>
                            <input
                                value={vehicleName}
                                onChange={(e) => setVehicleName(e.target.value)}
                                placeholder="Enter human-readable vehicle name"
                                style={{
                                    width: "100%",
                                    padding: "10px 14px",
                                    borderRadius: "8px",
                                    background: "#080d13",
                                    border: "1px solid #293440",
                                    color: "#fff",
                                    fontSize: "13px",
                                    boxSizing: "border-box",
                                }}
                            />
                        </div>

                        <div className="identity-grid">
                            <IdentityValue label="VEHICLE ADDRESS" value={identity.address} />
                            <IdentityValue label="PUBLIC KEY" value={identity.publicKey} />
                            <IdentityValue label="PUBLIC KEY HASH" value={identity.publicKeyHash} />
                        </div>

                        <div className="identity-actions" style={{ marginTop: "1.25rem" }}>
                            <button
                                className="primary-button"
                                disabled={registeringVehicle}
                                onClick={handleVehicleRegistration}
                            >
                                {registeringVehicle
                                    ? "Submitting blockchain transaction..."
                                    : `Register "${vehicleName.trim() || "Vehicle"}" on Blockchain`}
                            </button>

                            <button className="secondary-button" onClick={removeLocalIdentity}>
                                Remove Local Identity
                            </button>
                        </div>

                        {vehicleResult && <TransactionResult result={vehicleResult} />}
                    </div>
                )}
            </section>

            {/* ==================================================
                RSU REGISTRATION
            ================================================== */}
            <section className="panel registry-panel" style={{ marginTop: "1.5rem" }}>
                <div className="panel-header">
                    <div>
                        <h3>Roadside Unit (RSU) Deployment</h3>
                        <span>Register stationary roadside verification infrastructure</span>
                    </div>
                    <span className="module-tag">RSU DEPLOYMENT</span>
                </div>

                <form className="registry-form" onSubmit={handleRsuRegistration}>
                    <label>
                        <span>RSU IDENTIFIER</span>
                        <input
                            value={rsuId}
                            onChange={(e) => setRsuId(e.target.value)}
                            placeholder="e.g. RSU-05"
                            required
                        />
                    </label>

                    <label>
                        <span>DEPLOYMENT LOCATION</span>
                        <input
                            value={rsuLocation}
                            onChange={(e) => setRsuLocation(e.target.value)}
                            placeholder="e.g. West Highway Corridor"
                            required
                        />
                    </label>

                    <button className="primary-button" disabled={registeringRsu}>
                        {registeringRsu ? "Submitting..." : "Register RSU on Blockchain"}
                    </button>
                </form>

                {rsuResult && <TransactionResult result={rsuResult} />}
            </section>

            {/* ==================================================
                REGISTERED VEHICLES TABLE (WITH NAMES & DEACTIVATE)
            ================================================== */}
            <section className="panel registry-table-panel" style={{ marginTop: "1.5rem" }}>
                <div className="panel-header">
                    <div>
                        <h3>Registered Vehicles</h3>
                        <span>Blockchain-backed vehicle identities discovered from on-chain state</span>
                    </div>
                    <div className="table-count">{vehicles.length} registered</div>
                </div>

                {loading ? (
                    <LoadingState />
                ) : vehicles.length === 0 ? (
                    <EmptyState
                        icon="▣"
                        title="No vehicles registered"
                        description="Generate a vehicle identity above and register it on the blockchain."
                    />
                ) : (
                    <div className="registry-table-wrap">
                        <table className="registry-table compact-table" style={{ minWidth: "100%" }}>
                            <thead>
                                <tr>
                                    <th style={{ width: "16%" }}>VEHICLE NAME</th>
                                    <th style={{ width: "24%" }}>ETHEREUM ADDRESS</th>
                                    <th style={{ width: "14%" }}>STATUS</th>
                                    <th style={{ width: "16%" }}>KEY HASH</th>
                                    <th style={{ width: "14%" }}>REGISTERED</th>
                                    <th style={{ width: "8%" }}>BLOCK</th>
                                    <th style={{ width: "8%" }}>ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {vehicles.map((vehicle) => {
                                    const isRevoked = vehicle.revoked;
                                    return (
                                        <tr key={vehicle.vehicleAddress || vehicle.transactionHash}>
                                            <td>
                                                <strong style={{ color: "#fff", display: "flex", alignItems: "center", gap: "6px" }}>
                                                    <span>🚗</span> {vehicle.name || "Vehicle"}
                                                </strong>
                                            </td>
                                            <td>
                                                <code>{shorten(vehicle.vehicleAddress, 10, 8)}</code>
                                            </td>
                                            <td>
                                                <span className={isRevoked ? "status-badge revoked" : "status-badge active"}>
                                                    <span />
                                                    {isRevoked ? "INACTIVE" : "ACTIVE"}
                                                </span>
                                            </td>
                                            <td>
                                                <code>{shorten(vehicle.publicKeyHash, 8, 6)}</code>
                                            </td>
                                            <td>
                                                <span style={{ fontSize: "11px", color: "#aaa" }}>
                                                    {formatTimestamp(vehicle.registeredAt)}
                                                </span>
                                            </td>
                                            <td>
                                                <code>{vehicle.blockNumber ? "#" + vehicle.blockNumber : "Mined"}</code>
                                            </td>
                                            <td>
                                                {!isRevoked ? (
                                                    <button
                                                        className="secondary-button"
                                                        style={{
                                                            color: "#e63946",
                                                            borderColor: "#e63946",
                                                            padding: "4px 8px",
                                                            fontSize: "11px",
                                                            background: "rgba(230, 57, 70, 0.08)",
                                                        }}
                                                        onClick={() => setVehicleToDeactivate(vehicle)}
                                                    >
                                                        Deactivate
                                                    </button>
                                                ) : (
                                                    <span style={{ color: "#666", fontSize: "11px" }}>Deactivated</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* ==================================================
                REGISTERED RSUs (WITH DEACTIVATE / ACTIVATE)
            ================================================== */}
            <section className="panel registry-table-panel" style={{ marginTop: "1.5rem" }}>
                <div className="panel-header">
                    <div>
                        <h3>Registered Roadside Units (RSUs)</h3>
                        <span>Infrastructure nodes managed via <code>setRSUStatus</code> in smart contract</span>
                    </div>
                    <div className="table-count">
                        {rsus.filter((r) => r.active).length} Active / {rsus.filter((r) => !r.active).length} Inactive
                    </div>
                </div>

                {loading ? (
                    <LoadingState />
                ) : rsus.length === 0 ? (
                    <EmptyState
                        icon="◈"
                        title="No RSUs registered"
                        description="Register an RSU above before starting V2I authentication."
                    />
                ) : (
                    <div className="rsu-grid">
                        {rsus.map((rsu) => (
                            <div className="rsu-card" key={rsu.id}>
                                <div className="rsu-card-top">
                                    <div className="rsu-icon">📡</div>
                                    <span className={rsu.active ? "status-badge active" : "status-badge revoked"}>
                                        <span />
                                        {rsu.active ? "ACTIVE" : "INACTIVE"}
                                    </span>
                                </div>

                                <strong style={{ fontSize: "16px", marginTop: "8px", display: "block" }}>{rsu.id}</strong>
                                <p style={{ margin: "4px 0", color: "#bbb", fontSize: "12px" }}>{rsu.location}</p>

                                <div className="rsu-meta" style={{ marginTop: "8px", fontSize: "11px", color: "#888" }}>
                                    <div>Address: <code>{shorten(rsu.rsuAddress, 8, 6)}</code></div>
                                    <div style={{ marginTop: "2px" }}>Registered: {formatTimestamp(rsu.registeredAt)}</div>
                                </div>

                                {/* RSU ACTION BUTTON */}
                                <div style={{ marginTop: "14px", borderTop: "1px solid #1c2630", paddingTop: "10px" }}>
                                    {rsu.active ? (
                                        <button
                                            className="secondary-button"
                                            style={{
                                                width: "100%",
                                                color: "#e63946",
                                                borderColor: "rgba(230, 57, 70, 0.4)",
                                                background: "rgba(230, 57, 70, 0.08)",
                                                fontSize: "11px",
                                                padding: "6px 10px",
                                            }}
                                            onClick={() => setRsuToToggle({ ...rsu, targetActive: false })}
                                        >
                                            Deactivate RSU
                                        </button>
                                    ) : (
                                        <button
                                            className="secondary-button"
                                            style={{
                                                width: "100%",
                                                color: "#06d6a0",
                                                borderColor: "rgba(6, 214, 160, 0.4)",
                                                background: "rgba(6, 214, 160, 0.08)",
                                                fontSize: "11px",
                                                padding: "6px 10px",
                                            }}
                                            onClick={() => setRsuToToggle({ ...rsu, targetActive: true })}
                                        >
                                            Activate RSU
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* ==================================================
                CONFIRMATION MODAL: VEHICLE DEACTIVATION
            ================================================== */}
            {vehicleToDeactivate && (
                <div className="modal-backdrop" onClick={() => !deactivatingVehicle && setVehicleToDeactivate(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span style={{ color: "#e63946" }}>⚠️</span> Confirm Vehicle Deactivation
                            </h3>
                            <button
                                style={{ background: "none", border: "none", color: "#888", fontSize: "16px", cursor: "pointer" }}
                                onClick={() => !deactivatingVehicle && setVehicleToDeactivate(null)}
                            >
                                ✕
                            </button>
                        </div>
                        <div className="modal-body">
                            <p>
                                Are you sure you want to deactivate vehicle <strong>&quot;{vehicleToDeactivate.name || "Vehicle"}&quot;</strong>?
                            </p>
                            <div style={{ padding: "10px", background: "#0b1118", borderRadius: "6px", border: "1px solid #293440", fontSize: "11px", fontFamily: "monospace", margin: "10px 0" }}>
                                Address: {vehicleToDeactivate.vehicleAddress}
                            </div>
                            <p style={{ color: "#e63946", fontSize: "12px", margin: 0 }}>
                                <strong>Impact:</strong> This will commit an identity revocation transaction to the <code>AuthRegistry.sol</code> smart contract. The vehicle will be immediately blocked from requesting challenges, authenticating with RSUs, and executing handovers.
                            </p>
                        </div>
                        <div className="modal-actions">
                            <button
                                className="secondary-button"
                                onClick={() => setVehicleToDeactivate(null)}
                                disabled={deactivatingVehicle}
                            >
                                Cancel
                            </button>
                            <button
                                className="primary-button"
                                style={{ background: "#e63946", borderColor: "#e63946" }}
                                onClick={confirmDeactivateVehicle}
                                disabled={deactivatingVehicle}
                            >
                                {deactivatingVehicle ? "Deactivating on Blockchain..." : "Confirm Deactivation"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ==================================================
                CONFIRMATION MODAL: RSU STATUS TOGGLE
            ================================================== */}
            {rsuToToggle && (
                <div className="modal-backdrop" onClick={() => !togglingRsu && setRsuToToggle(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span style={{ color: rsuToToggle.targetActive ? "#06d6a0" : "#e63946" }}>
                                    {rsuToToggle.targetActive ? "✓" : "⚠️"}
                                </span>{" "}
                                {rsuToToggle.targetActive ? "Activate RSU" : "Deactivate RSU"}
                            </h3>
                            <button
                                style={{ background: "none", border: "none", color: "#888", fontSize: "16px", cursor: "pointer" }}
                                onClick={() => !togglingRsu && setRsuToToggle(null)}
                            >
                                ✕
                            </button>
                        </div>
                        <div className="modal-body">
                            <p>
                                Are you sure you want to {rsuToToggle.targetActive ? "reactivate" : "deactivate"}{" "}
                                <strong>&quot;{rsuToToggle.id}&quot;</strong> ({rsuToToggle.location})?
                            </p>
                            <div style={{ padding: "10px", background: "#0b1118", borderRadius: "6px", border: "1px solid #293440", fontSize: "11px", fontFamily: "monospace", margin: "10px 0" }}>
                                RSU Address: {rsuToToggle.rsuAddress}
                            </div>
                            <p style={{ color: rsuToToggle.targetActive ? "#06d6a0" : "#e63946", fontSize: "12px", margin: 0 }}>
                                <strong>Impact:</strong> This calls <code>setRSUStatus(&quot;{rsuToToggle.id}&quot;, {String(rsuToToggle.targetActive)})</code> on the smart contract. Once deactivated, vehicles cannot request challenges or handover sessions through this node.
                            </p>
                        </div>
                        <div className="modal-actions">
                            <button
                                className="secondary-button"
                                onClick={() => setRsuToToggle(null)}
                                disabled={togglingRsu}
                            >
                                Cancel
                            </button>
                            <button
                                className="primary-button"
                                style={{
                                    background: rsuToToggle.targetActive ? "#06d6a0" : "#e63946",
                                    borderColor: rsuToToggle.targetActive ? "#06d6a0" : "#e63946",
                                    color: rsuToToggle.targetActive ? "#000" : "#fff",
                                }}
                                onClick={confirmToggleRsuStatus}
                                disabled={togglingRsu}
                            >
                                {togglingRsu ? "Submitting Transaction..." : `Confirm ${rsuToToggle.targetActive ? "Activation" : "Deactivation"}`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function IdentityValue({ label, value }) {
    return (
        <div className="identity-value">
            <span>{label}</span>
            <code title={value}>{value}</code>
        </div>
    );
}

function TransactionResult({ result }) {
    return (
        <div className="protocol-result success" style={{ marginTop: "1rem" }}>
            <div className="result-symbol">✓</div>
            <div>
                <strong>TRANSACTION MINED ON BLOCKCHAIN</strong>
                <div style={{ fontSize: "12px", marginTop: "4px" }}>
                    Transaction Hash: <code>{shorten(result.transactionHash, 14, 10)}</code>
                </div>
                {result.blockNumber && (
                    <div style={{ fontSize: "11px", color: "#aaa", marginTop: "2px" }}>
                        Mined in Block #{result.blockNumber}
                    </div>
                )}
            </div>
        </div>
    );
}

function LoadingState() {
    return (
        <div style={{ padding: "2rem", textAlign: "center", color: "#888" }}>
            Loading blockchain records...
        </div>
    );
}

function EmptyState({ icon, title, description }) {
    return (
        <div style={{ padding: "2rem", textAlign: "center", color: "#888" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>{icon}</div>
            <strong style={{ color: "#fff", display: "block", marginBottom: "0.25rem" }}>{title}</strong>
            <p style={{ margin: 0, fontSize: "12px" }}>{description}</p>
        </div>
    );
}

export default VehicleRegistry;
