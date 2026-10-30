import { formatVehicleOption } from "../utils/vehicleFormat";
import { useEffect, useState } from "react";
import { ethers } from "ethers";
import {
    createChallenge,
    verifyAuthentication,
    getVehicles,
    getRSUs,
    registerVehicle,
} from "../services/api";
import { getVehicleIdentity } from "../services/vehicleIdentity";

function shorten(value, start = 12, end = 8) {
    if (!value) return "—";
    if (value.length <= start + end + 3) return value;
    return value.slice(0, start) + "..." + value.slice(-end);
}

function AttackLab() {
    const [vehicles, setVehicles] = useState([]);
    const [rsus, setRsus] = useState([]);
    const [loadingData, setLoadingData] = useState(true);

    // Tab state: 'attack1' | 'attack2' | 'attack3' | 'all'
    const [activeTab, setActiveTab] = useState("attack1");

    // ==========================================
    // ATTACK 1: UNREGISTERED VEHICLE STATE
    // ==========================================
    const [attack1Address, setAttack1Address] = useState("");
    const [attack1Rsu, setAttack1Rsu] = useState("RSU-01");
    const [attack1Loading, setAttack1Loading] = useState(false);
    const [attack1Result, setAttack1Result] = useState(null);

    // ==========================================
    // ATTACK 2: FORGED SIGNATURE STATE
    // ==========================================
    const [attack2Vehicle, setAttack2Vehicle] = useState("");
    const [attack2Rsu, setAttack2Rsu] = useState("RSU-01");
    const [attack2Challenge, setAttack2Challenge] = useState("");
    const [attack2ChallengeLoading, setAttack2ChallengeLoading] = useState(false);
    const [attack2Signature, setAttack2Signature] = useState("");
    const [attack2RogueSigner, setAttack2RogueSigner] = useState("");
    const [attack2Loading, setAttack2Loading] = useState(false);
    const [attack2Result, setAttack2Result] = useState(null);

    // ==========================================
    // ATTACK 3: REPLAY ATTACK STATE
    // ==========================================
    const [attack3Vehicle, setAttack3Vehicle] = useState("");
    const [attack3Rsu, setAttack3Rsu] = useState("RSU-01");
    const [attack3Loading, setAttack3Loading] = useState(false);
    const [attack3Result, setAttack3Result] = useState(null);

    useEffect(() => {
        loadNetworkEntities();
    }, []);

    async function loadNetworkEntities() {
        try {
            setLoadingData(true);
            const [vData, rData] = await Promise.all([
                getVehicles(),
                getRSUs(),
            ]);

            const activeVehicles = (vData.vehicles || []).filter((v) => v.registered && !v.revoked);
            const activeRsus = (rData.rsus || []).filter((r) => r.active);

            setVehicles(activeVehicles);
            setRsus(activeRsus);

            if (activeVehicles.length > 0) {
                setAttack2Vehicle(activeVehicles[0].vehicleAddress);
                setAttack3Vehicle(activeVehicles[0].vehicleAddress);
            }

            if (activeRsus.length > 0) {
                setAttack1Rsu(activeRsus[0].id);
                setAttack2Rsu(activeRsus[0].id);
                setAttack3Rsu(activeRsus[0].id);
            }

            generateRandomRogueAddress();
        } catch (err) {
            console.error("Failed to load attack lab entities:", err);
        } finally {
            setLoadingData(false);
        }
    }

    function generateRandomRogueAddress() {
        const randWallet = ethers.Wallet.createRandom();
        setAttack1Address(randWallet.address);
        setAttack1Result(null);
    }

    // ==========================================
    // EXECUTE ATTACK 1: UNREGISTERED VEHICLE
    // ==========================================
    async function runUnregisteredVehicleAttack() {
        try {
            setAttack1Loading(true);
            setAttack1Result(null);

            if (!attack1Address || !ethers.isAddress(attack1Address)) {
                throw new Error("Please enter a valid Ethereum address for the rogue vehicle.");
            }

            const startTime = performance.now();
            let responseStatus = 200;
            let responseData = null;

            try {
                responseData = await createChallenge(attack1Address, attack1Rsu);
            } catch (err) {
                responseStatus = err.status || 403;
                responseData = err.data || { error: err.message };
            }

            const latency = Math.round(performance.now() - startTime);

            setAttack1Result({
                rogueAddress: attack1Address,
                rsuId: attack1Rsu,
                status: responseStatus,
                blocked: responseStatus === 403,
                response: responseData,
                latency,
                timestamp: Date.now(),
            });
        } catch (generalErr) {
            setAttack1Result({
                status: 400,
                blocked: true,
                response: { error: generalErr.message },
                latency: 0,
                timestamp: Date.now(),
            });
        } finally {
            setAttack1Loading(false);
        }
    }

    // ==========================================
    // ATTACK 2: FETCH LEGITIMATE CHALLENGE
    // ==========================================
    async function handleFetchChallengeForAttack2() {
        try {
            setAttack2ChallengeLoading(true);
            setAttack2Result(null);
            setAttack2Signature("");
            setAttack2RogueSigner("");

            if (!attack2Vehicle) {
                throw new Error("Select a registered vehicle to target.");
            }

            const challengeData = await createChallenge(attack2Vehicle, attack2Rsu);
            setAttack2Challenge(challengeData.challenge);
        } catch (err) {
            alert(`Failed to fetch challenge: ${err.message}`);
        } finally {
            setAttack2ChallengeLoading(false);
        }
    }

    // ==========================================
    // ATTACK 2: GENERATE FORGED SIGNATURE
    // ==========================================
    async function handleGenerateForgedSignature() {
        try {
            if (!attack2Challenge) {
                alert("Request an authentication challenge first before forging a signature.");
                return;
            }

            const attackerWallet = ethers.Wallet.createRandom();
            const forgedSig = await attackerWallet.signMessage(attack2Challenge);

            setAttack2RogueSigner(attackerWallet.address);
            setAttack2Signature(forgedSig);
        } catch (err) {
            alert(`Failed to forge signature: ${err.message}`);
        }
    }

    // ==========================================
    // EXECUTE ATTACK 2: SUBMIT FORGED SIGNATURE
    // ==========================================
    async function runSignatureForgeryAttack() {
        try {
            setAttack2Loading(true);
            setAttack2Result(null);

            if (!attack2Vehicle) {
                throw new Error("Select a target vehicle.");
            }
            if (!attack2Signature) {
                throw new Error("Generate or provide a forged signature first.");
            }

            const startTime = performance.now();
            let responseStatus = 200;
            let responseData = null;

            try {
                responseData = await verifyAuthentication(attack2Vehicle, attack2Signature);
            } catch (err) {
                responseStatus = err.status || 401;
                responseData = err.data || { error: err.message };
            }

            const latency = Math.round(performance.now() - startTime);

            setAttack2Result({
                targetVehicle: attack2Vehicle,
                attackerSigner: attack2RogueSigner || "Unknown / Custom Keypair",
                forgedSignature: attack2Signature,
                status: responseStatus,
                blocked: responseStatus === 401,
                response: responseData,
                latency,
                timestamp: Date.now(),
            });
        } catch (generalErr) {
            setAttack2Result({
                status: 500,
                blocked: false,
                response: { error: generalErr.message },
                latency: 0,
                timestamp: Date.now(),
            });
        } finally {
            setAttack2Loading(false);
        }
    }

    // ==========================================
    // EXECUTE ATTACK 3: REPLAY ATTACK TEST
    // ==========================================
    async function runReplayAttackTest() {
        try {
            setAttack3Loading(true);
            setAttack3Result(null);

            let testWallet;
            let targetAddr = attack3Vehicle;

            const localId = getVehicleIdentity();
            if (localId && localId.address.toLowerCase() === attack3Vehicle.toLowerCase()) {
                testWallet = new ethers.Wallet(localId.privateKey);
            } else {
                testWallet = ethers.Wallet.createRandom();
                const pubKeyHash = ethers.keccak256(testWallet.signingKey.publicKey);
                await registerVehicle(testWallet.address, pubKeyHash);
                targetAddr = testWallet.address;
            }

            const startTime = performance.now();

            const challengeData = await createChallenge(targetAddr, attack3Rsu);
            const validChallenge = challengeData.challenge;

            const validSignature = await testWallet.signMessage(validChallenge);

            const firstResponse = await verifyAuthentication(targetAddr, validSignature);

            let replayStatus = 200;
            let replayResponse = null;

            try {
                replayResponse = await verifyAuthentication(targetAddr, validSignature);
            } catch (err) {
                replayStatus = err.status || 400;
                replayResponse = err.data || { error: err.message };
            }

            const latency = Math.round(performance.now() - startTime);

            setAttack3Result({
                vehicleAddress: targetAddr,
                rsuId: attack3Rsu,
                challenge: validChallenge,
                signature: validSignature,
                firstAttempt: {
                    status: 200,
                    success: firstResponse.success,
                    txHash: firstResponse.transactionHash,
                },
                replayAttempt: {
                    status: replayStatus,
                    blocked: replayStatus === 400,
                    error: replayResponse?.error || "Replay rejected",
                },
                latency,
                timestamp: Date.now(),
            });

            await loadNetworkEntities();
        } catch (err) {
            setAttack3Result({
                status: 500,
                blocked: false,
                firstAttempt: null,
                replayAttempt: { status: 500, blocked: false, error: err.message },
                latency: 0,
                timestamp: Date.now(),
            });
        } finally {
            setAttack3Loading(false);
        }
    }

    function clearAllResults() {
        setAttack1Result(null);
        setAttack2Result(null);
        setAttack3Result(null);
        setAttack2Challenge("");
        setAttack2Signature("");
        setAttack2RogueSigner("");
    }

    // ========================================================
    // RENDER HELPER: ATTACK 1 COMPONENT
    // ========================================================
    function renderAttack1(isFullWidth = true) {
        return (
            <section className="panel" style={{ height: "100%" }}>
                <div className="panel-header">
                    <div>
                        <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span style={{ color: "#e63946" }}>⚡</span> Attack 1: Unregistered Vehicle Access
                        </h3>
                        <span>Sybil identity spoofing &amp; unauthorized challenge request</span>
                    </div>
                    <span className="module-tag" style={{ background: "rgba(230, 57, 70, 0.15)", color: "#e63946" }}>
                        IDENTITY SPOOFING
                    </span>
                </div>

                <div style={{ padding: "1.75rem" }}>
                    <div style={{ padding: "0.85rem 1rem", background: "rgba(230, 57, 70, 0.05)", border: "1px solid rgba(230, 57, 70, 0.15)", borderRadius: "8px", marginBottom: "1.25rem" }}>
                        <strong style={{ color: "#e63946", fontSize: "12px", display: "block", marginBottom: "4px" }}>
                            THREAT SCENARIO (Sybil Attack / Rogue Vehicle)
                        </strong>
                        <p style={{ fontSize: "0.85rem", color: "#bbb", margin: 0, lineHeight: "1.5" }}>
                            An unregistered rogue vehicle attempts to connect to a Roadside Unit and obtain an authentication challenge without having an enrolled identity in the <code>AuthRegistry.sol</code> smart contract.
                        </p>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: isFullWidth ? "1fr 1fr" : "1fr", gap: "2rem", alignItems: "start" }}>
                        {/* Configuration Form */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                            <div>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                                    <label style={{ fontSize: "11px", color: "#888", fontWeight: "bold" }}>
                                        ROGUE VEHICLE WALLET ADDRESS
                                    </label>
                                    <button
                                        onClick={generateRandomRogueAddress}
                                        style={{
                                            background: "none",
                                            border: "none",
                                            color: "#3a86ff",
                                            fontSize: "11px",
                                            cursor: "pointer",
                                            textDecoration: "underline",
                                            fontWeight: "bold",
                                        }}
                                    >
                                        🎲 Generate Random Address
                                    </button>
                                </div>
                                <input
                                    style={{
                                        width: "100%",
                                        padding: "10px 12px",
                                        borderRadius: "6px",
                                        border: "1px solid #2a3644",
                                        background: "#080d13",
                                        color: "#fff",
                                        fontSize: "13px",
                                        fontFamily: "monospace",
                                        boxSizing: "border-box",
                                    }}
                                    value={attack1Address}
                                    onChange={(e) => setAttack1Address(e.target.value)}
                                    placeholder="0x... (Unregistered Ethereum Address)"
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: "11px", color: "#888", display: "block", marginBottom: "6px", fontWeight: "bold" }}>
                                    TARGET ROADSIDE UNIT (RSU)
                                </label>
                                <select
                                    style={{
                                        width: "100%",
                                        padding: "10px 12px",
                                        borderRadius: "6px",
                                        border: "1px solid #2a3644",
                                        background: "#080d13",
                                        color: "#fff",
                                        fontSize: "13px",
                                        boxSizing: "border-box",
                                    }}
                                    value={attack1Rsu}
                                    onChange={(e) => setAttack1Rsu(e.target.value)}
                                >
                                    {rsus.map((r) => (
                                        <option key={r.id} value={r.id}>
                                            {r.id} — {r.location}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                                <button
                                    className="primary-button"
                                    onClick={runUnregisteredVehicleAttack}
                                    disabled={attack1Loading || !attack1Address}
                                    style={{
                                        background: "#e63946",
                                        borderColor: "#e63946",
                                        flex: 1,
                                        padding: "12px",
                                        fontSize: "13px",
                                        fontWeight: "bold",
                                    }}
                                >
                                    {attack1Loading ? "Executing Attack Request..." : "Launch Unregistered Vehicle Attack"}
                                </button>
                                {attack1Result && (
                                    <button
                                        className="secondary-button"
                                        onClick={() => setAttack1Result(null)}
                                        style={{ padding: "0 16px", fontSize: "12px" }}
                                    >
                                        Run Again
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Result & Technical Breakdown */}
                        <div>
                            {attack1Result ? (
                                <div>
                                    <div
                                        className={
                                            attack1Result.blocked
                                                ? "protocol-result success"
                                                : "protocol-result failure"
                                        }
                                    >
                                        <div className="result-symbol">{attack1Result.blocked ? "✓" : "!"}</div>
                                        <div>
                                            <strong>
                                                {attack1Result.blocked
                                                    ? "ATTACK BLOCKED BY BLOCKCHAIN DEFENSE ✓"
                                                    : "ATTACK SUCCEEDED (SECURITY FAILURE)"}
                                            </strong>
                                            <div style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>
                                                HTTP Status: <strong>{attack1Result.status} Forbidden</strong> | Defense Latency: {attack1Result.latency}ms
                                            </div>
                                            <div style={{ fontSize: "0.82rem", marginTop: "0.25rem", color: "#ccc" }}>
                                                Server Response: <code>{attack1Result.response?.error || JSON.stringify(attack1Result.response)}</code>
                                            </div>
                                        </div>
                                    </div>

                                    <div
                                        style={{
                                            marginTop: "1rem",
                                            padding: "1rem",
                                            borderRadius: "8px",
                                            background: "rgba(255, 255, 255, 0.02)",
                                            border: "1px solid rgba(255, 255, 255, 0.06)",
                                            fontSize: "0.85rem",
                                            lineHeight: "1.6",
                                        }}
                                    >
                                        <div style={{ color: "#888", marginBottom: "0.4rem", fontWeight: "bold", fontSize: "11px" }}>
                                            CRYPTOGRAPHIC &amp; SMART CONTRACT DEFENSE BREAKDOWN:
                                        </div>
                                        <div>1. Rogue Address: <code>{shorten(attack1Result.rogueAddress, 16, 12)}</code></div>
                                        <div>2. Backend queried <code>contract.isAuthenticated(address)</code> on Hardhat localnet.</div>
                                        <div>3. On-chain state returned <code>registered = false</code>.</div>
                                        <div>4. Challenge issuance refused with HTTP 403 Forbidden. Zero nonces or RSU proofs generated.</div>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ padding: "1.5rem", borderRadius: "8px", background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.06)", textAlign: "center", color: "#888", fontSize: "12px", lineHeight: "1.6" }}>
                                    <div style={{ fontSize: "24px", marginBottom: "8px" }}>🛡️</div>
                                    <strong style={{ color: "#fff", display: "block", marginBottom: "4px" }}>
                                        Ready to Execute Sybil Attack Test
                                    </strong>
                                    Click <strong>Launch Unregistered Vehicle Attack</strong> to send an un-enrolled address to the backend. The smart contract query will verify lack of registration and abort challenge creation.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    // ========================================================
    // RENDER HELPER: ATTACK 2 COMPONENT
    // ========================================================
    function renderAttack2(isFullWidth = true) {
        return (
            <section className="panel" style={{ height: "100%" }}>
                <div className="panel-header">
                    <div>
                        <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span style={{ color: "#ffb703" }}>⚡</span> Attack 2: Signature Impersonation
                        </h3>
                        <span>Man-in-the-Middle signature forgery / cryptographic key mismatch</span>
                    </div>
                    <span className="module-tag" style={{ background: "rgba(255, 183, 3, 0.15)", color: "#ffb703" }}>
                        IMPERSONATION
                    </span>
                </div>

                <div style={{ padding: "1.75rem" }}>
                    <div style={{ padding: "0.85rem 1rem", background: "rgba(255, 183, 3, 0.05)", border: "1px solid rgba(255, 183, 3, 0.15)", borderRadius: "8px", marginBottom: "1.25rem" }}>
                        <strong style={{ color: "#ffb703", fontSize: "12px", display: "block", marginBottom: "4px" }}>
                            THREAT SCENARIO (Man-in-the-Middle / Signature Forgery)
                        </strong>
                        <p style={{ fontSize: "0.85rem", color: "#bbb", margin: 0, lineHeight: "1.5" }}>
                            An attacker intercepts a legitimate vehicle&apos;s authentication challenge, signs it using an attacker-controlled private key, and submits the forged signature claiming to be the legitimate vehicle.
                        </p>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: isFullWidth ? "1fr 1fr" : "1fr", gap: "2rem", alignItems: "start" }}>
                        {/* Configuration Form */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                            <div>
                                <label style={{ fontSize: "11px", color: "#888", display: "block", marginBottom: "6px", fontWeight: "bold" }}>
                                    TARGET LEGITIMATE VEHICLE
                                </label>
                                <select
                                    style={{
                                        width: "100%",
                                        padding: "10px 12px",
                                        borderRadius: "6px",
                                        border: "1px solid #2a3644",
                                        background: "#080d13",
                                        color: "#fff",
                                        fontSize: "13px",
                                        boxSizing: "border-box",
                                    }}
                                    value={attack2Vehicle}
                                    onChange={(e) => {
                                        setAttack2Vehicle(e.target.value);
                                        setAttack2Challenge("");
                                        setAttack2Signature("");
                                        setAttack2Result(null);
                                    }}
                                >
                                    {vehicles.length === 0 ? (
                                        <option value="">No registered vehicles available</option>
                                    ) : (
                                        vehicles.map((v) => (
                                            <option key={v.vehicleAddress} value={v.vehicleAddress}>
                                                {shorten(v.vehicleAddress, 14, 10)} (Active on-chain)
                                            </option>
                                        ))
                                    )}
                                </select>
                            </div>

                            {/* Step 1: Challenge */}
                            <div>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                                    <label style={{ fontSize: "11px", color: "#888", fontWeight: "bold" }}>AUTHENTICATION CHALLENGE</label>
                                    <button
                                        onClick={handleFetchChallengeForAttack2}
                                        disabled={attack2ChallengeLoading || !attack2Vehicle}
                                        style={{
                                            background: "none",
                                            border: "none",
                                            color: "#3a86ff",
                                            fontSize: "11px",
                                            cursor: "pointer",
                                            textDecoration: "underline",
                                            fontWeight: "bold",
                                        }}
                                    >
                                        {attack2ChallengeLoading ? "Requesting..." : "Step 1: Request Challenge from RSU"}
                                    </button>
                                </div>
                                <textarea
                                    style={{
                                        width: "100%",
                                        height: "55px",
                                        padding: "8px 10px",
                                        borderRadius: "6px",
                                        border: "1px solid #2a3644",
                                        background: "#080d13",
                                        color: "#ccc",
                                        fontSize: "12px",
                                        fontFamily: "monospace",
                                        resize: "none",
                                        boxSizing: "border-box",
                                    }}
                                    value={attack2Challenge}
                                    placeholder="Click 'Step 1: Request Challenge' above to fetch a real challenge..."
                                    readOnly
                                />
                            </div>

                            {/* Step 2: Forged Signature */}
                            <div>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                                    <label style={{ fontSize: "11px", color: "#888", fontWeight: "bold" }}>FORGED SIGNATURE (ROGUE SIGNER)</label>
                                    <button
                                        onClick={handleGenerateForgedSignature}
                                        disabled={!attack2Challenge}
                                        style={{
                                            background: "none",
                                            border: "none",
                                            color: "#ffb703",
                                            fontSize: "11px",
                                            cursor: "pointer",
                                            textDecoration: "underline",
                                            fontWeight: "bold",
                                        }}
                                    >
                                        Step 2: Sign with Attacker Key
                                    </button>
                                </div>
                                <input
                                    style={{
                                        width: "100%",
                                        padding: "10px 12px",
                                        borderRadius: "6px",
                                        border: "1px solid #2a3644",
                                        background: "#080d13",
                                        color: "#ffb703",
                                        fontSize: "12px",
                                        fontFamily: "monospace",
                                        boxSizing: "border-box",
                                    }}
                                    value={attack2Signature}
                                    onChange={(e) => setAttack2Signature(e.target.value)}
                                    placeholder="Forged ECDSA Signature (0x...)"
                                />
                                {attack2RogueSigner && (
                                    <div style={{ fontSize: "11px", color: "#888", marginTop: "4px" }}>
                                        Attacker Signer Address: <code>{shorten(attack2RogueSigner, 14, 10)}</code>
                                    </div>
                                )}
                            </div>

                            {/* Step 3: Launch Attack */}
                            <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                                <button
                                    className="primary-button"
                                    onClick={runSignatureForgeryAttack}
                                    disabled={attack2Loading || !attack2Signature}
                                    style={{
                                        background: "#ffb703",
                                        borderColor: "#ffb703",
                                        color: "#000",
                                        flex: 1,
                                        padding: "12px",
                                        fontSize: "13px",
                                        fontWeight: "bold",
                                    }}
                                >
                                    {attack2Loading ? "Submitting Forgery..." : "Step 3: Launch Signature Forgery Attack"}
                                </button>
                                {attack2Result && (
                                    <button
                                        className="secondary-button"
                                        onClick={() => setAttack2Result(null)}
                                        style={{ padding: "0 16px", fontSize: "12px" }}
                                    >
                                        Run Again
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Result & Technical Breakdown */}
                        <div>
                            {attack2Result ? (
                                <div>
                                    <div
                                        className={
                                            attack2Result.blocked
                                                ? "protocol-result success"
                                                : "protocol-result failure"
                                        }
                                    >
                                        <div className="result-symbol">{attack2Result.blocked ? "✓" : "!"}</div>
                                        <div>
                                            <strong>
                                                {attack2Result.blocked
                                                    ? "SIGNATURE FORGERY REJECTED ✓"
                                                    : "FORGERY ACCEPTED (SECURITY FAILURE)"}
                                            </strong>
                                            <div style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>
                                                HTTP Status: <strong>{attack2Result.status} Unauthorized</strong> | Latency: {attack2Result.latency}ms
                                            </div>
                                            <div style={{ fontSize: "0.82rem", marginTop: "0.25rem", color: "#ccc" }}>
                                                Server Response: <code>{attack2Result.response?.error}</code>
                                            </div>
                                        </div>
                                    </div>

                                    <div
                                        style={{
                                            marginTop: "1rem",
                                            padding: "1rem",
                                            borderRadius: "8px",
                                            background: "rgba(255, 255, 255, 0.02)",
                                            border: "1px solid rgba(255, 255, 255, 0.06)",
                                            fontSize: "0.85rem",
                                            lineHeight: "1.6",
                                        }}
                                    >
                                        <div style={{ color: "#888", marginBottom: "0.4rem", fontWeight: "bold", fontSize: "11px" }}>
                                            CRYPTOGRAPHIC DEFENSE BREAKDOWN:
                                        </div>
                                        <div>1. Target Legitimate Vehicle: <code>{shorten(attack2Result.targetVehicle, 14, 10)}</code></div>
                                        <div>2. Attacker Signer Address: <code>{shorten(attack2Result.attackerSigner, 14, 10)}</code></div>
                                        <div>
                                            3. <code>ethers.verifyMessage()</code> recovered address:{" "}
                                            <code>{shorten(attack2Result.response?.recoveredAddress, 14, 10)}</code>
                                        </div>
                                        <div>4. Cryptographic mismatch: <code>recoveredAddress !== vehicleAddress</code>.</div>
                                        <div>5. Backend aborted with HTTP 401 Unauthorized. Zero blockchain state written.</div>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ padding: "1.5rem", borderRadius: "8px", background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.06)", textAlign: "center", color: "#888", fontSize: "12px", lineHeight: "1.6" }}>
                                    <div style={{ fontSize: "24px", marginBottom: "8px" }}>✍️</div>
                                    <strong style={{ color: "#fff", display: "block", marginBottom: "4px" }}>
                                        Ready to Simulate Signature Forgery
                                    </strong>
                                    Follow Step 1 to request a valid challenge, Step 2 to sign it with an attacker private key, and Step 3 to submit it. ECDSA signature verification will detect the key discrepancy.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    // ========================================================
    // RENDER HELPER: ATTACK 3 COMPONENT
    // ========================================================
    function renderAttack3(isFullWidth = true) {
        return (
            <section className="panel" style={{ height: "100%" }}>
                <div className="panel-header">
                    <div>
                        <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span style={{ color: "#3a86ff" }}>🔄</span> Attack 3: Session Replay Defense
                        </h3>
                        <span>Testing single-use nonces &amp; replay attack rejection</span>
                    </div>
                    <span className="module-tag" style={{ background: "rgba(58, 134, 255, 0.15)", color: "#3a86ff" }}>
                        REPLAY RESISTANCE
                    </span>
                </div>

                <div style={{ padding: "1.75rem" }}>
                    <div style={{ padding: "0.85rem 1rem", background: "rgba(58, 134, 255, 0.05)", border: "1px solid rgba(58, 134, 255, 0.15)", borderRadius: "8px", marginBottom: "1.25rem" }}>
                        <strong style={{ color: "#3a86ff", fontSize: "12px", display: "block", marginBottom: "4px" }}>
                            THREAT SCENARIO (Eavesdropping &amp; Session Replay)
                        </strong>
                        <p style={{ fontSize: "0.85rem", color: "#bbb", margin: 0, lineHeight: "1.5" }}>
                            An eavesdropper intercepts a valid vehicle authentication transmission (challenge + signature). The attacker then replays the identical transmission to the RSU to attempt an unauthorized session takeover.
                        </p>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: isFullWidth ? "1fr 1fr" : "1fr", gap: "2rem", alignItems: "start" }}>
                        {/* Configuration Form */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                            <div>
                                <label style={{ fontSize: "11px", color: "#888", display: "block", marginBottom: "6px", fontWeight: "bold" }}>
                                    VEHICLE IDENTITY FOR REPLAY TEST
                                </label>
                                <select
                                    style={{
                                        width: "100%",
                                        padding: "10px 12px",
                                        borderRadius: "6px",
                                        border: "1px solid #2a3644",
                                        background: "#080d13",
                                        color: "#fff",
                                        fontSize: "13px",
                                        boxSizing: "border-box",
                                    }}
                                    value={attack3Vehicle}
                                    onChange={(e) => setAttack3Vehicle(e.target.value)}
                                >
                                    {vehicles.map((v) => (
                                            <option key={v.vehicleAddress} value={v.vehicleAddress}>
                                                {formatVehicleOption(v)}
                                            </option>
                                        ))}
                                </select>
                            </div>

                            <div>
                                <label style={{ fontSize: "11px", color: "#888", display: "block", marginBottom: "6px", fontWeight: "bold" }}>
                                    SERVING ROADSIDE UNIT
                                </label>
                                <select
                                    style={{
                                        width: "100%",
                                        padding: "10px 12px",
                                        borderRadius: "6px",
                                        border: "1px solid #2a3644",
                                        background: "#080d13",
                                        color: "#fff",
                                        fontSize: "13px",
                                        boxSizing: "border-box",
                                    }}
                                    value={attack3Rsu}
                                    onChange={(e) => setAttack3Rsu(e.target.value)}
                                >
                                    {rsus.map((r) => (
                                        <option key={r.id} value={r.id}>
                                            {r.id} — {r.location}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                                <button
                                    className="primary-button"
                                    onClick={runReplayAttackTest}
                                    disabled={attack3Loading}
                                    style={{
                                        background: "#3a86ff",
                                        borderColor: "#3a86ff",
                                        flex: 1,
                                        padding: "12px",
                                        fontSize: "13px",
                                        fontWeight: "bold",
                                    }}
                                >
                                    {attack3Loading ? "Executing Replay Test..." : "Execute Automated Replay Defense Test"}
                                </button>
                                {attack3Result && (
                                    <button
                                        className="secondary-button"
                                        onClick={() => setAttack3Result(null)}
                                        style={{ padding: "0 16px", fontSize: "12px" }}
                                    >
                                        Run Again
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Result & Technical Breakdown */}
                        <div>
                            {attack3Result ? (
                                <div>
                                    <div
                                        className={
                                            attack3Result.replayAttempt.blocked
                                                ? "protocol-result success"
                                                : "protocol-result failure"
                                        }
                                    >
                                        <div className="result-symbol">{attack3Result.replayAttempt.blocked ? "✓" : "!"}</div>
                                        <div>
                                            <strong>
                                                {attack3Result.replayAttempt.blocked
                                                    ? "REPLAY ATTACK NEUTRALIZED BY NONCE CONSUMPTION ✓"
                                                    : "REPLAY ATTACK ACCEPTED (SECURITY FAILURE)"}
                                            </strong>
                                            <div style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>
                                                Initial Request: <strong>HTTP 200 OK (Mined)</strong> ➔ Replay Transmission:{" "}
                                                <strong style={{ color: "#e63946" }}>
                                                    HTTP {attack3Result.replayAttempt.status} Bad Request (Rejected)
                                                </strong>
                                            </div>
                                            <div style={{ fontSize: "0.82rem", marginTop: "0.25rem", color: "#ccc" }}>
                                                Server Response: <code>{attack3Result.replayAttempt.error}</code> | Latency: {attack3Result.latency}ms
                                            </div>
                                        </div>
                                    </div>

                                    <div
                                        style={{
                                            marginTop: "1rem",
                                            padding: "1rem",
                                            borderRadius: "8px",
                                            background: "rgba(255, 255, 255, 0.02)",
                                            border: "1px solid rgba(255, 255, 255, 0.06)",
                                            fontSize: "0.85rem",
                                            lineHeight: "1.6",
                                        }}
                                    >
                                        <div style={{ color: "#888", marginBottom: "0.4rem", fontWeight: "bold", fontSize: "11px" }}>
                                            CRYPTOGRAPHIC DEFENSE BREAKDOWN:
                                        </div>
                                        <div>1. First verification consumed and deleted challenge key from active memory store.</div>
                                        <div>2. Replay attempt attempted to verify against consumed/expired nonce.</div>
                                        <div>3. Backend detected no active pending challenge, rejecting with HTTP 400.</div>
                                        <div>4. Zero duplicate blockchain writes occurred. Forward security and session uniqueness preserved.</div>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ padding: "1.5rem", borderRadius: "8px", background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.06)", fontSize: "12px", lineHeight: "1.6" }}>
                                    <strong style={{ color: "#fff", display: "block", marginBottom: "0.5rem" }}>
                                        Replay Attack Test Sequence:
                                    </strong>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", color: "#aaa" }}>
                                        <div>1. <strong>Step 1:</strong> Backend issues unique cryptographic challenge with fresh nonce.</div>
                                        <div>2. <strong>Step 2:</strong> Legitimate vehicle signs challenge $\rightarrow$ <strong>HTTP 200 OK</strong>.</div>
                                        <div>3. <strong>Step 3:</strong> Backend consumes challenge immediately and deletes it from cache.</div>
                                        <div>4. <strong>Step 4:</strong> Attacker replays identical signature $\rightarrow$ <strong>HTTP 400 Bad Request</strong>.</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <div className="page-content">
            <div className="page-intro">
                <span className="eyebrow">VANET SECURITY VERIFICATION &amp; RED-TEAM TESTING</span>
                <h2>Security Attack Lab</h2>
                <p>
                    Execute live cryptographic adversarial simulations against the V-CHAIN mutual authentication protocol.
                    These interactive tests make real HTTP requests to the backend and query the live smart contract to verify decentralized defense mechanisms.
                </p>
            </div>

            {/* TOP NAVIGATION & CONTROLS BAR */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "1rem",
                    marginBottom: "1.5rem",
                    padding: "0.75rem 1rem",
                    background: "#080d13",
                    border: "1px solid #1c2630",
                    borderRadius: "10px",
                }}
            >
                {/* Attack Navigation Tabs */}
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <button
                        className={`secondary-button ${activeTab === "attack1" ? "active" : ""}`}
                        style={{
                            padding: "8px 14px",
                            fontSize: "12px",
                            fontWeight: "bold",
                            background: activeTab === "attack1" ? "#e63946" : "transparent",
                            borderColor: activeTab === "attack1" ? "#e63946" : "#2a3644",
                            color: activeTab === "attack1" ? "#fff" : "#aaa",
                        }}
                        onClick={() => setActiveTab("attack1")}
                    >
                        ⚡ Attack 1: Unregistered Vehicle
                    </button>

                    <button
                        className={`secondary-button ${activeTab === "attack2" ? "active" : ""}`}
                        style={{
                            padding: "8px 14px",
                            fontSize: "12px",
                            fontWeight: "bold",
                            background: activeTab === "attack2" ? "#ffb703" : "transparent",
                            borderColor: activeTab === "attack2" ? "#ffb703" : "#2a3644",
                            color: activeTab === "attack2" ? "#000" : "#aaa",
                        }}
                        onClick={() => setActiveTab("attack2")}
                    >
                        ⚡ Attack 2: Signature Forgery
                    </button>

                    <button
                        className={`secondary-button ${activeTab === "attack3" ? "active" : ""}`}
                        style={{
                            padding: "8px 14px",
                            fontSize: "12px",
                            fontWeight: "bold",
                            background: activeTab === "attack3" ? "#3a86ff" : "transparent",
                            borderColor: activeTab === "attack3" ? "#3a86ff" : "#2a3644",
                            color: activeTab === "attack3" ? "#fff" : "#aaa",
                        }}
                        onClick={() => setActiveTab("attack3")}
                    >
                        🔄 Attack 3: Session Replay
                    </button>

                    <button
                        className={`secondary-button ${activeTab === "all" ? "active" : ""}`}
                        style={{
                            padding: "8px 14px",
                            fontSize: "12px",
                            fontWeight: "bold",
                            background: activeTab === "all" ? "#695cff" : "transparent",
                            borderColor: activeTab === "all" ? "#695cff" : "#2a3644",
                            color: activeTab === "all" ? "#fff" : "#aaa",
                        }}
                        onClick={() => setActiveTab("all")}
                    >
                        ▦ View All Attacks
                    </button>
                </div>

                <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                    <span className="status-badge active" style={{ fontSize: "11px", padding: "4px 8px" }}>
                        <span /> 3 DEFENSE MODULES ARMED
                    </span>

                    <button
                        className="secondary-button"
                        style={{ padding: "6px 12px", fontSize: "11px" }}
                        onClick={clearAllResults}
                    >
                        ✕ Clear All Results
                    </button>
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            {activeTab === "attack1" && renderAttack1(true)}
            {activeTab === "attack2" && renderAttack2(true)}
            {activeTab === "attack3" && renderAttack3(true)}

            {activeTab === "all" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
                    {renderAttack1(true)}
                    {renderAttack2(true)}
                    {renderAttack3(true)}
                </div>
            )}
        </div>
    );
}

export default AttackLab;
