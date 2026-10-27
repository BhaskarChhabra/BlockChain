import {
    useEffect,
    useState,
} from "react";

import {
    getVehicles,
    getRSUs,
    registerVehicle,
    registerRSU,
} from "../services/api";

import {
    createVehicleIdentity,
    getVehicleIdentity,
    clearVehicleIdentity,
} from "../services/vehicleIdentity";


function shorten(
    value,
    start = 12,
    end = 8
) {

    if (!value) {
        return "—";
    }

    if (
        value.length <=
        start + end + 3
    ) {
        return value;
    }

    return (
        value.slice(0, start) +
        "..." +
        value.slice(-end)
    );
}


function formatTimestamp(
    timestamp
) {

    if (!timestamp) {
        return "—";
    }

    return new Date(
        timestamp * 1000
    ).toLocaleString();
}


function VehicleRegistry() {

    const [
        vehicles,
        setVehicles,
    ] = useState([]);

    const [
        rsus,
        setRsus,
    ] = useState([]);

    const [
        identity,
        setIdentity,
    ] = useState(null);

    const [
        registeringVehicle,
        setRegisteringVehicle,
    ] = useState(false);

    const [
        registeringRsu,
        setRegisteringRsu,
    ] = useState(false);

    const [
        rsuId,
        setRsuId,
    ] = useState("");

    const [
        rsuLocation,
        setRsuLocation,
    ] = useState("");

    const [
        vehicleResult,
        setVehicleResult,
    ] = useState(null);

    const [
        rsuResult,
        setRsuResult,
    ] = useState(null);

    const [
        error,
        setError,
    ] = useState("");

    const [
        loading,
        setLoading,
    ] = useState(true);


    // ========================================================
    // INITIAL LOAD
    // ========================================================

    useEffect(() => {

        const storedIdentity =
            getVehicleIdentity();

        setIdentity(
            storedIdentity
        );

        loadData();

    }, []);


    async function loadData() {

        try {

            setLoading(true);
            setError("");

            const [
                vehicleData,
                rsuData,
            ] =
                await Promise.all([
                    getVehicles(),
                    getRSUs(),
                ]);

            setVehicles(
                vehicleData.vehicles || []
            );

            setRsus(
                rsuData.rsus || []
            );

        } catch (err) {

            setError(
                err.message
            );

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
            setVehicleResult(null);

            const newIdentity =
                createVehicleIdentity();

            setIdentity(
                newIdentity
            );

        } catch (err) {

            setError(
                err.message
            );
        }
    }


    // ========================================================
    // REGISTER GENERATED VEHICLE
    // ========================================================

    async function handleVehicleRegistration() {

        try {

            setError("");
            setVehicleResult(null);

            const currentIdentity =
                getVehicleIdentity();

            if (!currentIdentity) {
                throw new Error(
                    "Generate a vehicle identity first."
                );
            }

            setRegisteringVehicle(
                true
            );

            const data =
                await registerVehicle(
                    currentIdentity.address,
                    currentIdentity.publicKeyHash
                );

            setVehicleResult(
                data
            );

            await loadData();

        } catch (err) {

            setError(
                err.message
            );

        } finally {

            setRegisteringVehicle(
                false
            );
        }
    }


    // ========================================================
    // REGISTER RSU
    // ========================================================

    async function handleRsuRegistration(
        event
    ) {

        event.preventDefault();

        try {

            setError("");
            setRsuResult(null);

            setRegisteringRsu(
                true
            );

            const data =
                await registerRSU(
                    rsuId.trim(),
                    rsuLocation.trim()
                );

            setRsuResult(
                data
            );

            setRsuId("");
            setRsuLocation("");

            await loadData();

        } catch (err) {

            setError(
                err.message
            );

        } finally {

            setRegisteringRsu(
                false
            );
        }
    }


    // ========================================================
    // REMOVE LOCAL IDENTITY
    // ========================================================

    function removeLocalIdentity() {

        clearVehicleIdentity();

        setIdentity(null);
    }


    return (
        <div className="page-content">

            <div className="page-intro">

                <span className="eyebrow">
                    IDENTITY MANAGEMENT
                </span>

                <h2>
                    Vehicle Registry
                </h2>

                <p>
                    Generate real vehicle cryptographic
                    identities and register them on the
                    blockchain-backed trust registry.
                </p>

            </div>


            {error && (
                <div className="alert alert-error">

                    <strong>
                        Registry error
                    </strong>

                    <span>
                        {error}
                    </span>

                </div>
            )}


            {/* ==================================================
                VEHICLE IDENTITY
            ================================================== */}

            <section className="panel">

                <div className="panel-header">

                    <div>

                        <h3>
                            Vehicle Cryptographic Identity
                        </h3>

                        <span>
                            A real secp256k1 keypair is generated
                            locally for the simulated vehicle.
                        </span>

                    </div>

                    <span className="module-tag">
                        CRYPTOGRAPHIC IDENTITY
                    </span>

                </div>


                {!identity ? (

                    <div className="identity-empty">

                        <div className="identity-symbol">
                            ◇
                        </div>

                        <h3>
                            No vehicle identity
                        </h3>

                        <p>
                            Generate a vehicle identity to
                            create an actual wallet address
                            and public-key hash.
                        </p>

                        <button
                            className="primary-button"
                            onClick={
                                generateVehicle
                            }
                        >
                            Generate Vehicle Identity
                        </button>

                    </div>

                ) : (

                    <div className="identity-content">

                        <div className="identity-status">

                            <div className="identity-live-dot" />

                            <div>

                                <strong>
                                    VEHICLE IDENTITY READY
                                </strong>

                                <span>
                                    Cryptographic material
                                    generated locally.
                                </span>

                            </div>

                        </div>


                        <div className="identity-grid">

                            <IdentityValue
                                label="VEHICLE ADDRESS"
                                value={
                                    identity.address
                                }
                            />

                            <IdentityValue
                                label="PUBLIC KEY"
                                value={
                                    identity.publicKey
                                }
                            />

                            <IdentityValue
                                label="PUBLIC KEY HASH"
                                value={
                                    identity.publicKeyHash
                                }
                            />

                        </div>


                        <div className="identity-actions">

                            <button
                                className="primary-button"
                                disabled={
                                    registeringVehicle
                                }
                                onClick={
                                    handleVehicleRegistration
                                }
                            >
                                {registeringVehicle
                                    ? "Submitting blockchain transaction..."
                                    : "Register Vehicle on Blockchain"}
                            </button>


                            <button
                                className="secondary-button"
                                onClick={
                                    removeLocalIdentity
                                }
                            >
                                Remove Local Identity
                            </button>

                        </div>


                        {vehicleResult && (
                            <TransactionResult
                                result={
                                    vehicleResult
                                }
                            />
                        )}

                    </div>
                )}

            </section>


            {/* ==================================================
                RSU
            ================================================== */}

            <section className="panel registry-form-panel">

                <div className="panel-header">

                    <div>

                        <h3>
                            RSU Infrastructure
                        </h3>

                        <span>
                            Register roadside units as
                            blockchain infrastructure nodes.
                        </span>

                    </div>

                    <span className="module-tag">
                        INFRASTRUCTURE
                    </span>

                </div>


                <form
                    className="registry-form"
                    onSubmit={
                        handleRsuRegistration
                    }
                >

                    <label>

                        <span>
                            RSU IDENTIFIER
                        </span>

                        <input
                            value={rsuId}
                            onChange={(event) =>
                                setRsuId(
                                    event.target.value
                                )
                            }
                            placeholder="Enter RSU identifier"
                            required
                        />

                    </label>


                    <label>

                        <span>
                            LOCATION
                        </span>

                        <input
                            value={
                                rsuLocation
                            }
                            onChange={(event) =>
                                setRsuLocation(
                                    event.target.value
                                )
                            }
                            placeholder="Enter deployment location"
                            required
                        />

                    </label>


                    <button
                        className="primary-button"
                        disabled={
                            registeringRsu
                        }
                    >
                        {registeringRsu
                            ? "Submitting..."
                            : "Register RSU on Blockchain"}
                    </button>

                </form>


                {rsuResult && (
                    <TransactionResult
                        result={
                            rsuResult
                        }
                    />
                )}

            </section>


            {/* ==================================================
                REGISTERED VEHICLES
            ================================================== */}

            <section className="panel registry-table-panel">

                <div className="panel-header">

                    <div>

                        <h3>
                            Registered Vehicles
                        </h3>

                        <span>
                            Blockchain-backed vehicle
                            identities discovered from events.
                        </span>

                    </div>

                    <div className="table-count">
                        {vehicles.length} registered
                    </div>

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

                        <table className="registry-table">

                            <thead>

                                <tr>

                                    <th>
                                        VEHICLE
                                    </th>

                                    <th>
                                        STATUS
                                    </th>

                                    <th>
                                        KEY HASH
                                    </th>

                                    <th>
                                        REGISTERED
                                    </th>

                                    <th>
                                        BLOCK
                                    </th>

                                    <th>
                                        TRANSACTION
                                    </th>

                                </tr>

                            </thead>


                            <tbody>

                                {vehicles.map(
                                    (vehicle) => (

                                        <tr
                                            key={
                                                vehicle.transactionHash
                                            }
                                        >

                                            <td>
                                                <code>
                                                    {
                                                        shorten(
                                                            vehicle.vehicleAddress
                                                        )
                                                    }
                                                </code>
                                            </td>


                                            <td>

                                                <span
                                                    className={
                                                        vehicle.revoked
                                                            ? "status-badge revoked"
                                                            : "status-badge active"
                                                    }
                                                >
                                                    <span />

                                                    {vehicle.revoked
                                                        ? "REVOKED"
                                                        : "ACTIVE"}

                                                </span>

                                            </td>


                                            <td>
                                                <code>
                                                    {
                                                        shorten(
                                                            vehicle.publicKeyHash
                                                        )
                                                    }
                                                </code>
                                            </td>


                                            <td>
                                                {
                                                    formatTimestamp(
                                                        vehicle.registeredAt
                                                    )
                                                }
                                            </td>


                                            <td>
                                                #
                                                {
                                                    vehicle.blockNumber
                                                }
                                            </td>


                                            <td>
                                                <code>
                                                    {
                                                        shorten(
                                                            vehicle.transactionHash,
                                                            8,
                                                            6
                                                        )
                                                    }
                                                </code>
                                            </td>

                                        </tr>

                                    )
                                )}

                            </tbody>

                        </table>

                    </div>

                )}

            </section>


            {/* ==================================================
                RSUs
            ================================================== */}

            <section className="panel registry-table-panel">

                <div className="panel-header">

                    <div>

                        <h3>
                            Registered RSUs
                        </h3>

                        <span>
                            Infrastructure discovered
                            directly from blockchain state.
                        </span>

                    </div>

                    <div className="table-count">
                        {rsus.length} RSUs
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

                        {rsus.map(
                            (rsu) => (

                                <div
                                    className="rsu-card"
                                    key={rsu.id}
                                >

                                    <div className="rsu-card-top">

                                        <div className="rsu-icon">
                                            ◈
                                        </div>

                                        <span
                                            className={
                                                rsu.active
                                                    ? "status-badge active"
                                                    : "status-badge revoked"
                                            }
                                        >

                                            <span />

                                            {rsu.active
                                                ? "ACTIVE"
                                                : "OFFLINE"}

                                        </span>

                                    </div>


                                    <strong>
                                        {rsu.id}
                                    </strong>

                                    <p>
                                        {rsu.location}
                                    </p>


                                    <div className="rsu-meta">

                                        <span>
                                            REGISTERED
                                        </span>

                                        <strong>
                                            {
                                                formatTimestamp(
                                                    rsu.registeredAt
                                                )
                                            }
                                        </strong>

                                    </div>

                                </div>

                            )
                        )}

                    </div>

                )}

            </section>

        </div>
    );
}


// ================================================================
// IDENTITY VALUE
// ================================================================

function IdentityValue({
    label,
    value,
}) {

    return (
        <div className="identity-value">

            <span>
                {label}
            </span>

            <code title={value}>
                {value}
            </code>

        </div>
    );
}


// ================================================================
// TRANSACTION
// ================================================================

function TransactionResult({
    result,
}) {

    return (
        <div className="transaction-result">

            <div className="transaction-success">
                ✓ Blockchain transaction confirmed
            </div>

            <div>

                <span>
                    TRANSACTION
                </span>

                <code>
                    {shorten(
                        result.transactionHash,
                        14,
                        10
                    )}
                </code>

            </div>


            <div>

                <span>
                    BLOCK
                </span>

                <code>
                    #{result.blockNumber}
                </code>

            </div>

        </div>
    );
}


// ================================================================
// LOADING
// ================================================================

function LoadingState() {

    return (
        <div className="table-state">

            <div className="loader" />

            <span>
                Reading blockchain state...
            </span>

        </div>
    );
}


// ================================================================
// EMPTY
// ================================================================

function EmptyState({
    icon,
    title,
    description,
}) {

    return (
        <div className="table-state">

            <div className="empty-icon">
                {icon}
            </div>

            <strong>
                {title}
            </strong>

            <span>
                {description}
            </span>

        </div>
    );
}


export default VehicleRegistry;