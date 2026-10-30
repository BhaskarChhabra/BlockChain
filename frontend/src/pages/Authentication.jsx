import { formatVehicleOption } from "../utils/vehicleFormat";
import { useEffect, useMemo, useState } from "react";

import {
    getVehicles,
    getRSUs,
    getLastAuthentication,
} from "../services/api";

import {
    requestAuthentication,
    verifyRsuProof,
    signAuthenticationChallenge,
    authenticateVehicle,
} from "../services/authentication";

import {
    getVehicleIdentity,
} from "../services/vehicleIdentity";


function shorten(value, start = 12, end = 8) {
    if (!value) return "—";

    if (value.length <= start + end + 3) {
        return value;
    }

    return (
        value.slice(0, start) +
        "..." +
        value.slice(-end)
    );
}


function formatTime(timestamp) {
    if (!timestamp) return "—";

    return new Date(
        timestamp * 1000
    ).toLocaleString();
}


const STAGES = [
    "Challenge Request",
    "RSU Verification",
    "Vehicle Proof",
    "Mutual Commitment",
];


function Authentication() {
    const [vehicles, setVehicles] = useState([]);
    const [rsus, setRsus] = useState([]);

    const [vehicleAddress, setVehicleAddress] = useState("");
    const [rsuId, setRsuId] = useState("");

    const [challenge, setChallenge] = useState(null);
    const [rsuVerification, setRsuVerification] = useState(null);
    const [signature, setSignature] = useState("");
    const [authenticationResult, setAuthenticationResult] = useState(null);
    const [lastAuthentication, setLastAuthentication] = useState(null);

    const [stage, setStage] = useState(0);

    const [loadingData, setLoadingData] = useState(true);
    const [loadingChallenge, setLoadingChallenge] = useState(false);
    const [verifyingRsu, setVerifyingRsu] = useState(false);
    const [signing, setSigning] = useState(false);
    const [verifying, setVerifying] = useState(false);

    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    const identity = useMemo(() => getVehicleIdentity(), []);

    // ========================================================
    // LOAD REAL BLOCKCHAIN DATA
    // ========================================================

    useEffect(() => {
        loadParticipants();
    }, []);

    async function loadParticipants() {
        try {
            setLoadingData(true);
            setError("");

            const [vehicleData, rsuData] = await Promise.all([
                getVehicles(),
                getRSUs(),
            ]);

            const activeVehicles = (vehicleData.vehicles || []).filter(
                (vehicle) => vehicle.registered && !vehicle.revoked
            );

            const activeRsus = (rsuData.rsus || []).filter(
                (rsu) => rsu.active
            );

            setVehicles(activeVehicles);
            setRsus(activeRsus);

            const localVehicle =
                identity &&
                activeVehicles.find(
                    (vehicle) =>
                        vehicle.vehicleAddress.toLowerCase() ===
                        identity.address.toLowerCase()
                );

            if (localVehicle) {
                setVehicleAddress(localVehicle.vehicleAddress);
            } else if (activeVehicles.length > 0) {
                setVehicleAddress(activeVehicles[0].vehicleAddress);
            }

            if (activeRsus.length > 0) {
                setRsuId(activeRsus[0].id);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoadingData(false);
        }
    }

    // ========================================================
    // LOAD LAST AUTHENTICATION
    // ========================================================

    useEffect(() => {
        if (!vehicleAddress) return;
        loadLastAuthentication(vehicleAddress);
    }, [vehicleAddress]);

    async function loadLastAuthentication(address) {
        try {
            const result = await getLastAuthentication(address);
            setLastAuthentication(result);
        } catch {
            setLastAuthentication(null);
        }
    }

    // ========================================================
    // STAGE 1: GENERATE CHALLENGE & RECEIVE RSU PROOF
    // ========================================================

    async function handleGenerateChallenge() {
        try {
            setError("");
            setMessage("");

            setChallenge(null);
            setRsuVerification(null);
            setSignature("");
            setAuthenticationResult(null);

            if (!vehicleAddress) {
                throw new Error("Select a registered vehicle first.");
            }

            if (!rsuId) {
                throw new Error("Select an active RSU first.");
            }

            setLoadingChallenge(true);
            setStage(0);

            const result = await requestAuthentication(
                vehicleAddress,
                rsuId
            );

            setChallenge(result);
            setStage(1);
            setMessage("Mutual authentication challenge and RSU cryptographic proof received.");
        } catch (err) {
            setError(err.message);
        } finally {
            setLoadingChallenge(false);
        }
    }

    // ========================================================
    // STAGE 2: VEHICLE VERIFIES RSU IDENTITY
    // ========================================================

    function handleVerifyRsu() {
        try {
            setError("");
            setMessage("");

            if (!challenge?.rsuProof) {
                throw new Error("Generate a challenge first to obtain RSU proof.");
            }

            setVerifyingRsu(true);

            const vResult = verifyRsuProof(
                challenge.rsuProof,
                challenge.rsuAddress
            );

            setRsuVerification(vResult);

            if (!vResult.valid) {
                throw new Error("RSU proof verification FAILED: Signature does not match registered RSU address!");
            }

            setStage(2);
            setMessage(`RSU ${challenge.rsuId} identity cryptographically verified by vehicle (${vResult.recoveredAddress}).`);
        } catch (err) {
            setError(err.message);
        } finally {
            setVerifyingRsu(false);
        }
    }

    // ========================================================
    // STAGE 3: VEHICLE SIGNS CHALLENGE
    // ========================================================

    async function handleSignChallenge() {
        try {
            setError("");
            setMessage("");

            if (!challenge?.challenge) {
                throw new Error("Generate an authentication challenge first.");
            }

            if (
                !identity ||
                identity.address.toLowerCase() !== vehicleAddress.toLowerCase()
            ) {
                throw new Error(
                    "The selected vehicle does not match the locally generated vehicle identity key."
                );
            }

            setSigning(true);

            const result = await signAuthenticationChallenge(
                challenge.challenge
            );

            setSignature(result.signature);
            setStage(3);
            setMessage("Challenge signed by vehicle with local secp256k1 private key.");
        } catch (err) {
            setError(err.message);
        } finally {
            setSigning(false);
        }
    }

    // ========================================================
    // STAGE 4: BACKEND VERIFICATION & BLOCKCHAIN RECORD
    // ========================================================

    async function handleVerify() {
        try {
            setError("");
            setMessage("");

            if (!signature) {
                throw new Error("Vehicle signature is required.");
            }

            setVerifying(true);

            const result = await authenticateVehicle(
                vehicleAddress,
                signature
            );

            setAuthenticationResult(result);
            setStage(4);
            setMessage("Mutual authentication confirmed and committed to the blockchain.");

            await loadLastAuthentication(vehicleAddress);
        } catch (err) {
            setStage(3);
            setAuthenticationResult({
                authenticated: false,
                error: err.message,
            });
            setError(err.message);
        } finally {
            setVerifying(false);
        }
    }

    // ========================================================
    // RESET
    // ========================================================

    function resetAuthentication() {
        setChallenge(null);
        setRsuVerification(null);
        setSignature("");
        setAuthenticationResult(null);
        setStage(0);
        setError("");
        setMessage("");
    }

    const selectedVehicle = vehicles.find(
        (v) => v.vehicleAddress.toLowerCase() === vehicleAddress.toLowerCase()
    );

    const selectedRsu = rsus.find((r) => r.id === rsuId);

    return (
        <div className="page-content">
            <div className="page-intro">
                <span className="eyebrow">SECURITY PROTOCOL</span>
                <h2>Decentralized Mutual Authentication</h2>
                <p>
                    Execute two-way cryptographic verification: the vehicle verifies the RSU&apos;s
                    blockchain-anchored keypair, and the RSU verifies the vehicle&apos;s signed challenge before committing on-chain.
                </p>
            </div>

            {error && (
                <div className="alert alert-error">
                    <strong>Authentication Error:</strong>
                    <span>{error}</span>
                </div>
            )}

            {message && !error && (
                <div className="alert alert-success">
                    <strong>Protocol Status:</strong>
                    <span>{message}</span>
                </div>
            )}

            {/* PARTICIPANTS */}
            <section className="panel">
                <div className="panel-header">
                    <div>
                        <h3>Authentication Participants</h3>
                        <span>Identities discovered from the blockchain state</span>
                    </div>
                    <span className="live-label">● LIVE</span>
                </div>

                <div className="auth-selection">
                    {/* VEHICLE */}
                    <div className="selection-card">
                        <span className="section-label">VEHICLE IDENTITY</span>
                        <select
                            className="dark-dropdown"
                            value={vehicleAddress}
                            onChange={(e) => {
                                setVehicleAddress(e.target.value);
                                resetAuthentication();
                            }}
                            disabled={loadingData || vehicles.length === 0}
                        >
                            <option value="">Select registered vehicle</option>
                            {vehicles.map((v) => (
                                <option key={v.vehicleAddress} value={v.vehicleAddress}>
                                    {formatVehicleOption(v)}
                                </option>
                            ))}
                        </select>

                        {selectedVehicle && (
                            <div className="participant-info">
                                <strong>ACTIVE VEHICLE</strong>
                                <code>{selectedVehicle.vehicleAddress}</code>
                                <span>Key hash: {shorten(selectedVehicle.publicKeyHash, 10, 8)}</span>
                            </div>
                        )}
                    </div>

                    <div className="selection-arrow">⇄</div>

                    {/* RSU */}
                    <div className="selection-card">
                        <span className="section-label">TARGET ROADSIDE UNIT (RSU)</span>
                        <select
                            className="dark-dropdown"
                            value={rsuId}
                            onChange={(e) => {
                                setRsuId(e.target.value);
                                resetAuthentication();
                            }}
                            disabled={loadingData || rsus.length === 0}
                        >
                            <option value="">Select active RSU</option>
                            {rsus.map((r) => (
                                <option key={r.id} value={r.id}>
                                    {r.id} — {r.location}
                                </option>
                            ))}
                        </select>

                        {selectedRsu && (
                            <div className="participant-info">
                                <strong>ACTIVE RSU NODE</strong>
                                <span>Location: {selectedRsu.location}</span>
                                <code>Address: {shorten(selectedRsu.rsuAddress, 12, 8)}</code>
                            </div>
                        )}
                    </div>
                </div>

                {vehicles.length === 0 && (
                    <div className="participant-warning">
                        No active registered vehicles found. Register a vehicle in Vehicle Registry first.
                    </div>
                )}
            </section>

            {/* PROTOCOL TIMELINE */}
            <section className="panel protocol-panel">
                <div className="panel-header">
                    <div>
                        <h3>Mutual Authentication Workflow</h3>
                        <span>4-Stage Bidirectional Cryptographic Verification</span>
                    </div>
                    <span className="live-label">● LIVE</span>
                </div>

                <div className="protocol-timeline">
                    {STAGES.map((stageName, index) => {
                        const completed = stage > index;
                        const active = stage === index;

                        return (
                            <div className="protocol-stage-wrap" key={stageName}>
                                <div
                                    className={
                                        "protocol-stage " +
                                        (completed ? "complete " : "") +
                                        (active ? "active" : "")
                                    }
                                >
                                    <div className="stage-number">
                                        {completed ? "✓" : `0${index + 1}`}
                                    </div>
                                    <strong>{stageName}</strong>
                                </div>
                                {index < STAGES.length - 1 && (
                                    <div
                                        className={
                                            completed
                                                ? "protocol-line completed"
                                                : "protocol-line"
                                        }
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* PROTOCOL BODY */}
                <div className="protocol-body">
                    {!challenge ? (
                        <div className="protocol-empty">
                            <div className="empty-icon">◇</div>
                            <strong>Awaiting Mutual Challenge Initiation</strong>
                            <span>Select an active vehicle and RSU, then click &quot;Generate Challenge&quot;.</span>
                        </div>
                    ) : (
                        <div className="protocol-data">
                            {/* RSU PROOF VERIFICATION SECTION */}
                            <div style={{ marginBottom: "1.25rem", padding: "1rem", borderRadius: "8px", background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                                    <span className="section-label" style={{ margin: 0 }}>
                                        [RSU → VEHICLE] RSU CRYPTOGRAPHIC PROOF
                                    </span>
                                    {rsuVerification?.valid ? (
                                        <span className="status-badge active" style={{ fontSize: "0.75rem" }}>
                                            RSU VERIFIED ✓
                                        </span>
                                    ) : (
                                        <span className="status-badge" style={{ fontSize: "0.75rem", background: "rgba(255, 170, 0, 0.15)", color: "#ffb703" }}>
                                            UNVERIFIED
                                        </span>
                                    )}
                                </div>
                                <code className="large-code" style={{ fontSize: "0.78rem" }}>
                                    {challenge.rsuProof?.message}
                                </code>
                                <div style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "#888" }}>
                                    RSU Signature: <code>{shorten(challenge.rsuProof?.signature, 20, 16)}</code>
                                </div>
                                <div style={{ marginTop: "0.35rem", fontSize: "0.75rem", color: "#888" }}>
                                    Expected On-Chain RSU Address: <code>{challenge.rsuAddress}</code>
                                </div>
                            </div>

                            {/* VEHICLE CHALLENGE SECTION */}
                            <div style={{ padding: "1rem", borderRadius: "8px", background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                                <span className="section-label">
                                    [VEHICLE → RSU] VEHICLE CHALLENGE &amp; PROOF
                                </span>
                                <code className="large-code" style={{ fontSize: "0.78rem" }}>
                                    {challenge.challenge}
                                </code>
                                <div className="data-meta" style={{ marginTop: "0.75rem" }}>
                                    <span>
                                        CHALLENGE HASH
                                        <strong>{shorten(challenge.challengeHash, 12, 8)}</strong>
                                    </span>
                                    <span>
                                        TARGET RSU
                                        <strong>{challenge.rsuId}</strong>
                                    </span>
                                    <span>
                                        EXPIRES AT
                                        <strong>{new Date(challenge.expiresAt).toLocaleTimeString()}</strong>
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* VEHICLE SIGNATURE */}
                    {signature && (
                        <div className="protocol-data protocol-data-spaced">
                            <span className="section-label">VEHICLE SECP256K1 SIGNATURE</span>
                            <code className="large-code">{signature}</code>
                        </div>
                    )}

                    {/* RESULT CARD */}
                    {authenticationResult && (
                        <div
                            className={
                                authenticationResult.authenticated
                                    ? "protocol-result success"
                                    : "protocol-result failure"
                            }
                        >
                            <div className="result-symbol">
                                {authenticationResult.authenticated ? "✓" : "!"}
                            </div>
                            <div>
                                <strong>
                                    {authenticationResult.authenticated
                                        ? "MUTUAL AUTHENTICATION SUCCESSFUL"
                                        : "AUTHENTICATION REJECTED"}
                                </strong>
                                <span>
                                    {authenticationResult.authenticated
                                        ? "Both Vehicle and RSU identities were cryptographically verified. Authentication session committed to blockchain block #" + authenticationResult.blockNumber + "."
                                        : authenticationResult.error}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* ACTIONS */}
                    <div className="protocol-actions">
                        {/* Step 1 */}
                        <button
                            className="primary-button"
                            onClick={handleGenerateChallenge}
                            disabled={loadingChallenge || !vehicleAddress || !rsuId}
                        >
                            {loadingChallenge ? "Generating..." : "1. Request Challenge"}
                        </button>

                        {/* Step 2 */}
                        <button
                            className="secondary-button"
                            onClick={handleVerifyRsu}
                            disabled={!challenge || rsuVerification?.valid || verifyingRsu}
                        >
                            {verifyingRsu ? "Verifying RSU..." : "2. Verify RSU Proof"}
                        </button>

                        {/* Step 3 */}
                        <button
                            className="secondary-button"
                            onClick={handleSignChallenge}
                            disabled={signing || !rsuVerification?.valid || !!signature}
                        >
                            {signing ? "Signing..." : "3. Sign with Vehicle"}
                        </button>

                        {/* Step 4 */}
                        <button
                            className="secondary-button"
                            onClick={handleVerify}
                            disabled={verifying || !signature || authenticationResult?.authenticated}
                        >
                            {verifying ? "Verifying..." : "4. Verify & Record on Blockchain"}
                        </button>

                        <button
                            className="icon-button"
                            onClick={resetAuthentication}
                            title="Reset authentication"
                        >
                            ↻
                        </button>
                    </div>
                </div>
            </section>

            {/* CRYPTOGRAPHIC EVIDENCE */}
            <div className="auth-results-grid">
                <section className="panel">
                    <div className="panel-header">
                        <div>
                            <h3>Cryptographic Evidence</h3>
                            <span>Mutual verification parameters from this session</span>
                        </div>
                    </div>

                    <div className="evidence-list">
                        <EvidenceRow label="Vehicle Address" value={vehicleAddress} />
                        <EvidenceRow label="Target RSU Node" value={rsuId} />
                        <EvidenceRow label="RSU Registered Address" value={challenge?.rsuAddress} />
                        <EvidenceRow
                            label="RSU Proof Status"
                            value={
                                rsuVerification?.valid
                                    ? "Verified ✓ (Matched on-chain address)"
                                    : challenge
                                        ? "Pending verification"
                                        : null
                            }
                        />
                        <EvidenceRow
                            label="Vehicle Signature Status"
                            value={
                                authenticationResult?.authenticated
                                    ? "Verified on Blockchain ✓"
                                    : signature
                                        ? "Signed locally"
                                        : null
                            }
                        />
                        <EvidenceRow
                            label="Blockchain Transaction"
                            value={authenticationResult?.transactionHash}
                        />
                        <EvidenceRow
                            label="Block Number"
                            value={
                                authenticationResult?.blockNumber
                                    ? `#${authenticationResult.blockNumber}`
                                    : null
                            }
                        />
                    </div>
                </section>

                {/* LAST ON-CHAIN AUTH */}
                <section
                    className={
                        authenticationResult?.authenticated
                            ? "auth-result-card success"
                            : "auth-result-card"
                    }
                >
                    <div className="result-symbol">
                        {authenticationResult?.authenticated ? "✓" : "◇"}
                    </div>

                    <span className="section-label">LATEST BLOCKCHAIN AUTHENTICATION</span>

                    <h2>
                        {authenticationResult?.authenticated
                            ? "Mutual Authenticated"
                            : lastAuthentication?.successful
                                ? "Authenticated"
                                : "Awaiting Authentication"}
                    </h2>

                    {authenticationResult?.authenticated ? (
                        <>
                            <p>
                                Vehicle {shorten(vehicleAddress)} and {rsuId} mutually established verified trust.
                            </p>
                            <div className="result-metric">
                                <strong>On-Chain Block #{authenticationResult.blockNumber}</strong>
                                <span>Tx: {shorten(authenticationResult.transactionHash, 10, 8)}</span>
                            </div>
                        </>
                    ) : lastAuthentication?.successful ? (
                        <>
                            <p>Previous authentication was confirmed on the blockchain.</p>
                            <div className="result-metric">
                                <strong>{lastAuthentication.rsuId}</strong>
                                <span>{formatTime(lastAuthentication.timestamp)}</span>
                            </div>
                        </>
                    ) : (
                        <p>Execute the 4-stage mutual protocol to establish authenticated V2I trust.</p>
                    )}
                </section>
            </div>
        </div>
    );
}

function EvidenceRow({ label, value }) {
    return (
        <div className="evidence-item">
            <span>{label}</span>
            <code title={value || ""}>{value || "Waiting..."}</code>
        </div>
    );
}

export default Authentication;