import { useEffect, useMemo, useState } from "react";

import {
    getVehicles,
    getRSUs,
    getLastAuthentication,
} from "../services/api";

import {
    requestAuthentication,
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
    "Challenge",
    "Vehicle Signature",
    "Verification",
    "Blockchain Record",
];


function Authentication() {

    const [vehicles, setVehicles] = useState([]);
    const [rsus, setRsus] = useState([]);

    const [vehicleAddress, setVehicleAddress] =
        useState("");

    const [rsuId, setRsuId] =
        useState("");

    const [challenge, setChallenge] =
        useState(null);

    const [signature, setSignature] =
        useState("");

    const [authenticationResult, setAuthenticationResult] =
        useState(null);

    const [lastAuthentication, setLastAuthentication] =
        useState(null);

    const [stage, setStage] =
        useState(0);

    const [loadingData, setLoadingData] =
        useState(true);

    const [loadingChallenge, setLoadingChallenge] =
        useState(false);

    const [signing, setSigning] =
        useState(false);

    const [verifying, setVerifying] =
        useState(false);

    const [error, setError] =
        useState("");

    const [message, setMessage] =
        useState("");

    const identity =
        useMemo(
            () => getVehicleIdentity(),
            []
        );


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

            const [
                vehicleData,
                rsuData,
            ] = await Promise.all([
                getVehicles(),
                getRSUs(),
            ]);

            const activeVehicles =
                (vehicleData.vehicles || [])
                    .filter(
                        (vehicle) =>
                            vehicle.registered &&
                            !vehicle.revoked
                    );

            const activeRsus =
                (rsuData.rsus || [])
                    .filter(
                        (rsu) =>
                            rsu.active
                    );

            setVehicles(
                activeVehicles
            );

            setRsus(
                activeRsus
            );

            // Prefer the locally generated vehicle
            // if it is actually registered.
            const localVehicle =
                identity &&
                activeVehicles.find(
                    (vehicle) =>
                        vehicle.vehicleAddress.toLowerCase() ===
                        identity.address.toLowerCase()
                );

            if (localVehicle) {
                setVehicleAddress(
                    localVehicle.vehicleAddress
                );
            } else if (
                activeVehicles.length > 0
            ) {
                setVehicleAddress(
                    activeVehicles[0]
                        .vehicleAddress
                );
            }

            if (activeRsus.length > 0) {
                setRsuId(
                    activeRsus[0].id
                );
            }

        } catch (err) {

            setError(
                err.message
            );

        } finally {

            setLoadingData(false);
        }
    }


    // ========================================================
    // LOAD LAST AUTHENTICATION
    // ========================================================

    useEffect(() => {

        if (!vehicleAddress) {
            return;
        }

        loadLastAuthentication(
            vehicleAddress
        );

    }, [vehicleAddress]);


    async function loadLastAuthentication(
        address
    ) {

        try {

            const result =
                await getLastAuthentication(
                    address
                );

            setLastAuthentication(
                result
            );

        } catch {
            setLastAuthentication(
                null
            );
        }
    }


    // ========================================================
    // GENERATE CHALLENGE
    // ========================================================

    async function handleGenerateChallenge() {

        try {

            setError("");
            setMessage("");

            setChallenge(null);
            setSignature("");
            setAuthenticationResult(null);

            if (!vehicleAddress) {
                throw new Error(
                    "Select a vehicle first."
                );
            }

            if (!rsuId) {
                throw new Error(
                    "Select an RSU first."
                );
            }

            setLoadingChallenge(true);

            setStage(0);

            const result =
                await requestAuthentication(
                    vehicleAddress,
                    rsuId
                );

            setChallenge(
                result
            );

            setStage(1);

            setMessage(
                "Fresh authentication challenge generated."
            );

        } catch (err) {

            setError(
                err.message
            );

        } finally {

            setLoadingChallenge(false);
        }
    }


    // ========================================================
    // SIGN CHALLENGE
    // ========================================================

    async function handleSignChallenge() {

        try {

            setError("");
            setMessage("");

            if (!challenge?.challenge) {
                throw new Error(
                    "Generate an authentication challenge first."
                );
            }

            if (
                !identity ||
                identity.address.toLowerCase() !==
                vehicleAddress.toLowerCase()
            ) {
                throw new Error(
                    "The selected vehicle does not match the locally available vehicle identity."
                );
            }

            setSigning(true);

            const result =
                await signAuthenticationChallenge(
                    challenge.challenge
                );

            setSignature(
                result.signature
            );

            setStage(2);

            setMessage(
                "Challenge signed by the selected vehicle identity."
            );

        } catch (err) {

            setError(
                err.message
            );

        } finally {

            setSigning(false);
        }
    }


    // ========================================================
    // VERIFY + RECORD
    // ========================================================

    async function handleVerify() {

        try {

            setError("");
            setMessage("");

            if (!signature) {
                throw new Error(
                    "Vehicle signature is required."
                );
            }

            setVerifying(true);

            setStage(3);

            const result =
                await authenticateVehicle(
                    vehicleAddress,
                    signature
                );

            setAuthenticationResult(
                result
            );

            setStage(4);

            setMessage(
                "Vehicle authenticated and authentication record committed to blockchain."
            );

            await loadLastAuthentication(
                vehicleAddress
            );

        } catch (err) {

            setStage(2);

            setAuthenticationResult(
                {
                    authenticated: false,
                    error: err.message,
                }
            );

            setError(
                err.message
            );

        } finally {

            setVerifying(false);
        }
    }


    // ========================================================
    // RESET
    // ========================================================

    function resetAuthentication() {

        setChallenge(null);
        setSignature("");
        setAuthenticationResult(null);

        setStage(0);

        setError("");
        setMessage("");
    }


    const selectedVehicle =
        vehicles.find(
            (vehicle) =>
                vehicle.vehicleAddress.toLowerCase() ===
                vehicleAddress.toLowerCase()
        );

    const selectedRsu =
        rsus.find(
            (rsu) =>
                rsu.id === rsuId
        );


    return (
        <div className="page-content">

            {/* ==================================================
                HEADER
            ================================================== */}

            <div className="page-intro">

                <span className="eyebrow">
                    SECURITY PROTOCOL
                </span>

                <h2>
                    V2I Authentication
                </h2>

                <p>
                    Execute a real challenge-response
                    authentication between a registered
                    vehicle identity and an active roadside unit.
                </p>

            </div>


            {/* ==================================================
                ERROR
            ================================================== */}

            {error && (
                <div className="alert alert-error">

                    <strong>
                        Authentication error
                    </strong>

                    <span>
                        {error}
                    </span>

                </div>
            )}


            {/* ==================================================
                SUCCESS MESSAGE
            ================================================== */}

            {message && !error && (
                <div className="alert alert-success">

                    <strong>
                        Protocol status
                    </strong>

                    <span>
                        {message}
                    </span>

                </div>
            )}


            {/* ==================================================
                PARTICIPANTS
            ================================================== */}

            <section className="panel">

                <div className="panel-header">

                    <div>

                        <h3>
                            Authentication Participants
                        </h3>

                        <span>
                            Vehicles and roadside units are
                            discovered from the backend blockchain state.
                        </span>

                    </div>

                    <span className="live-label">
                        ● LIVE
                    </span>

                </div>


                <div className="auth-selection">

                    {/* VEHICLE */}

                    <div className="selection-card">

                        <span className="section-label">
                            VEHICLE
                        </span>

                        <select
                            value={
                                vehicleAddress
                            }
                            onChange={(event) => {
                                setVehicleAddress(
                                    event.target.value
                                );

                                resetAuthentication();
                            }}
                            disabled={
                                loadingData ||
                                vehicles.length === 0
                            }
                        >

                            <option value="">
                                Select registered vehicle
                            </option>

                            {vehicles.map(
                                (vehicle) => (
                                    <option
                                        key={
                                            vehicle.vehicleAddress
                                        }
                                        value={
                                            vehicle.vehicleAddress
                                        }
                                    >
                                        {shorten(
                                            vehicle.vehicleAddress,
                                            15,
                                            10
                                        )}
                                    </option>
                                )
                            )}

                        </select>


                        {selectedVehicle && (
                            <div className="participant-info">

                                <strong>
                                    ACTIVE VEHICLE
                                </strong>

                                <code>
                                    {
                                        selectedVehicle.vehicleAddress
                                    }
                                </code>

                                <span>
                                    Key hash:{" "}
                                    {
                                        shorten(
                                            selectedVehicle.publicKeyHash,
                                            10,
                                            8
                                        )
                                    }
                                </span>

                            </div>
                        )}

                    </div>


                    <div className="selection-arrow">
                        →
                    </div>


                    {/* RSU */}

                    <div className="selection-card">

                        <span className="section-label">
                            TARGET RSU
                        </span>

                        <select
                            value={rsuId}
                            onChange={(event) => {
                                setRsuId(
                                    event.target.value
                                );

                                resetAuthentication();
                            }}
                            disabled={
                                loadingData ||
                                rsus.length === 0
                            }
                        >

                            <option value="">
                                Select active RSU
                            </option>

                            {rsus.map(
                                (rsu) => (
                                    <option
                                        key={rsu.id}
                                        value={rsu.id}
                                    >
                                        {rsu.id}
                                    </option>
                                )
                            )}

                        </select>


                        {selectedRsu && (
                            <div className="participant-info">

                                <strong>
                                    ACTIVE RSU
                                </strong>

                                <span>
                                    {
                                        selectedRsu.location
                                    }
                                </span>

                            </div>
                        )}

                    </div>

                </div>


                {vehicles.length === 0 && (
                    <div className="participant-warning">
                        No active registered vehicles were found.
                        Create and register a vehicle identity first.
                    </div>
                )}

                {rsus.length === 0 && (
                    <div className="participant-warning">
                        No active RSUs were found.
                        Register an RSU in Vehicle Registry first.
                    </div>
                )}

            </section>


            {/* ==================================================
                PROTOCOL
            ================================================== */}

            <section className="panel protocol-panel">

                <div className="panel-header">

                    <div>

                        <h3>
                            Challenge-Response Protocol
                        </h3>

                        <span>
                            Every stage uses live cryptographic
                            data from the selected participants.
                        </span>

                    </div>

                    <span className="live-label">
                        ● LIVE
                    </span>

                </div>


                <div className="protocol-timeline">

                    {STAGES.map(
                        (stageName, index) => {

                            const completed =
                                stage > index;

                            const active =
                                stage === index;

                            return (
                                <div
                                    className="protocol-stage-wrap"
                                    key={stageName}
                                >

                                    <div
                                        className={
                                            "protocol-stage " +
                                            (
                                                completed
                                                    ? "complete "
                                                    : ""
                                            ) +
                                            (
                                                active
                                                    ? "active"
                                                    : ""
                                            )
                                        }
                                    >

                                        <div className="stage-number">

                                            {completed
                                                ? "✓"
                                                : `0${index + 1}`}

                                        </div>

                                        <strong>
                                            {stageName}
                                        </strong>

                                    </div>

                                    {index <
                                        STAGES.length - 1 && (
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
                        }
                    )}

                </div>


                {/* ==================================================
                    CHALLENGE DATA
                ================================================== */}

                <div className="protocol-body">

                    {!challenge ? (

                        <div className="protocol-empty">

                            <div className="empty-icon">
                                ◇
                            </div>

                            <strong>
                                Waiting for authentication challenge
                            </strong>

                            <span>
                                Select an active vehicle and RSU,
                                then request a fresh challenge.
                            </span>

                        </div>

                    ) : (

                        <div className="protocol-data">

                            <span className="section-label">
                                CHALLENGE NONCE
                            </span>

                            <code className="large-code">
                                {
                                    challenge.challenge
                                }
                            </code>


                            <div className="data-meta">

                                <span>
                                    CHALLENGE HASH

                                    <strong>
                                        {
                                            shorten(
                                                challenge.challengeHash,
                                                15,
                                                10
                                            )
                                        }
                                    </strong>
                                </span>

                                <span>
                                    RSU

                                    <strong>
                                        {
                                            challenge.rsuId
                                        }
                                    </strong>
                                </span>

                                <span>
                                    EXPIRES

                                    <strong>
                                        {
                                            new Date(
                                                challenge.expiresAt
                                            ).toLocaleTimeString()
                                        }
                                    </strong>
                                </span>

                            </div>

                        </div>
                    )}


                    {/* ==================================================
                        SIGNATURE
                    ================================================== */}

                    {signature && (
                        <div className="protocol-data protocol-data-spaced">

                            <span className="section-label">
                                VEHICLE SIGNATURE
                            </span>

                            <code className="large-code">
                                {
                                    signature
                                }
                            </code>

                        </div>
                    )}


                    {/* ==================================================
                        BLOCKCHAIN RESULT
                    ================================================== */}

                    {authenticationResult && (
                        <div
                            className={
                                authenticationResult.authenticated
                                    ? "protocol-result success"
                                    : "protocol-result failure"
                            }
                        >

                            <div className="result-symbol">

                                {authenticationResult.authenticated
                                    ? "✓"
                                    : "!"}

                            </div>

                            <div>

                                <strong>
                                    {
                                        authenticationResult.authenticated
                                            ? "VEHICLE AUTHENTICATED"
                                            : "AUTHENTICATION REJECTED"
                                    }
                                </strong>

                                <span>
                                    {
                                        authenticationResult.authenticated
                                            ? "The vehicle signature was verified and the authentication event was recorded on-chain."
                                            : authenticationResult.error
                                    }
                                </span>

                            </div>

                        </div>
                    )}


                    {/* ==================================================
                        ACTIONS
                    ================================================== */}

                    <div className="protocol-actions">

                        <button
                            className="primary-button"
                            onClick={
                                handleGenerateChallenge
                            }
                            disabled={
                                loadingChallenge ||
                                !vehicleAddress ||
                                !rsuId
                            }
                        >
                            {loadingChallenge
                                ? "Generating..."
                                : "Generate Challenge"}
                        </button>


                        <button
                            className="secondary-button"
                            onClick={
                                handleSignChallenge
                            }
                            disabled={
                                signing ||
                                !challenge ||
                                !!signature
                            }
                        >
                            {signing
                                ? "Signing..."
                                : "Sign with Vehicle"}
                        </button>


                        <button
                            className="secondary-button"
                            onClick={
                                handleVerify
                            }
                            disabled={
                                verifying ||
                                !signature
                            }
                        >
                            {verifying
                                ? "Verifying..."
                                : "Verify & Record"}
                        </button>


                        <button
                            className="icon-button"
                            onClick={
                                resetAuthentication
                            }
                            title="Reset authentication"
                        >
                            ↻
                        </button>

                    </div>

                </div>

            </section>


            {/* ==================================================
                EVIDENCE + LAST AUTH
            ================================================== */}

            <div className="auth-results-grid">

                <section className="panel">

                    <div className="panel-header">

                        <div>

                            <h3>
                                Cryptographic Evidence
                            </h3>

                            <span>
                                Evidence generated during this
                                authentication session.
                            </span>

                        </div>

                    </div>


                    <div className="evidence-list">

                        <EvidenceRow
                            label="Vehicle"
                            value={
                                vehicleAddress
                            }
                        />

                        <EvidenceRow
                            label="RSU"
                            value={
                                rsuId
                            }
                        />

                        <EvidenceRow
                            label="Challenge hash"
                            value={
                                challenge?.challengeHash
                            }
                        />

                        <EvidenceRow
                            label="Recovered address"
                            value={
                                authenticationResult?.recoveredAddress
                            }
                        />

                        <EvidenceRow
                            label="Transaction"
                            value={
                                authenticationResult?.transactionHash
                            }
                        />

                        <EvidenceRow
                            label="Block"
                            value={
                                authenticationResult?.blockNumber
                                    ? `#${authenticationResult.blockNumber}`
                                    : null
                            }
                        />

                    </div>

                </section>


                {/* LAST AUTH */}

                <section
                    className={
                        authenticationResult?.authenticated
                            ? "auth-result-card success"
                            : "auth-result-card"
                    }
                >

                    <div className="result-symbol">

                        {authenticationResult?.authenticated
                            ? "✓"
                            : "◇"}

                    </div>


                    <span className="section-label">
                        LAST BLOCKCHAIN AUTHENTICATION
                    </span>


                    <h2>
                        {authenticationResult?.authenticated
                            ? "Authenticated"
                            : lastAuthentication?.successful
                                ? "Authenticated"
                                : "Awaiting Authentication"}
                    </h2>


                    {authenticationResult?.authenticated ? (

                        <>
                            <p>
                                Vehicle{" "}
                                {shorten(
                                    vehicleAddress
                                )}{" "}
                                successfully authenticated
                                with{" "}
                                {rsuId}.
                            </p>

                            <div className="result-metric">

                                <strong>
                                    On-chain
                                </strong>

                                <span>
                                    Authentication record confirmed
                                </span>

                            </div>
                        </>

                    ) : lastAuthentication?.successful ? (

                        <>
                            <p>
                                Previous successful
                                authentication was recorded
                                by the blockchain.
                            </p>

                            <div className="result-metric">

                                <strong>
                                    {
                                        lastAuthentication.rsuId
                                    }
                                </strong>

                                <span>
                                    {
                                        formatTime(
                                            lastAuthentication.timestamp
                                        )
                                    }
                                </span>

                            </div>
                        </>

                    ) : (

                        <p>
                            Execute the challenge-response
                            protocol to authenticate the
                            selected vehicle.
                        </p>

                    )}

                </section>

            </div>

        </div>
    );
}


// ================================================================
// EVIDENCE ROW
// ================================================================

function EvidenceRow({
    label,
    value,
}) {

    return (
        <div className="evidence-item">

            <span>
                {label}
            </span>

            <code title={value || ""}>
                {value || "Waiting..."}
            </code>

        </div>
    );
}


export default Authentication;