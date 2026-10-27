const API_BASE_URL = "http://localhost:5001";

async function request(
    endpoint,
    options = {}
) {
    const response = await fetch(
        `${API_BASE_URL}${endpoint}`,
        {
            ...options,

            headers: {
                "Content-Type":
                    "application/json",

                ...(options.headers || {}),
            },
        }
    );

    let data = {};

    try {
        data = await response.json();
    } catch {
        // Empty response
    }

    if (!response.ok) {
        throw new Error(
            data.error ||
            data.message ||
            `Request failed (${response.status})`
        );
    }

    return data;
}


// ============================================================
// BLOCKCHAIN
// ============================================================

export function getBlockchainStatus() {
    return request("/blockchain");
}


// ============================================================
// VEHICLES
// ============================================================

export function getVehicles() {
    return request("/vehicles");
}

export function getVehicle(
    address
) {
    return request(
        `/vehicle/${address}`
    );
}

export function registerVehicle(
    vehicleAddress,
    publicKeyHash
) {
    return request(
        "/register",
        {
            method: "POST",

            body: JSON.stringify({
                vehicleAddress,
                publicKeyHash,
            }),
        }
    );
}


// ============================================================
// RSUs
// ============================================================

export function getRSUs() {
    return request("/rsus");
}

export function registerRSU(
    rsuId,
    location
) {
    return request(
        "/rsus",
        {
            method: "POST",

            body: JSON.stringify({
                rsuId,
                location,
            }),
        }
    );
}


// ============================================================
// AUTHENTICATION
// ============================================================

export function createChallenge(
    vehicleAddress,
    rsuId
) {
    return request(
        "/authenticate/challenge",
        {
            method: "POST",

            body: JSON.stringify({
                vehicleAddress,
                rsuId,
            }),
        }
    );
}

export function verifyAuthentication(
    vehicleAddress,
    signature
) {
    return request(
        "/authenticate/verify",
        {
            method: "POST",

            body: JSON.stringify({
                vehicleAddress,
                signature,
            }),
        }
    );
}

export function getLastAuthentication(
    vehicleAddress
) {
    return request(
        `/authenticate/${vehicleAddress}`
    );
}


// ============================================================
// HANDOVER
// ============================================================

export function executeHandover(
    vehicleAddress,
    rsuId
) {
    return request(
        "/handover",
        {
            method: "POST",

            body: JSON.stringify({
                vehicleAddress,
                rsuId,
            }),
        }
    );
}

export function getLastHandover(
    vehicleAddress
) {
    return request(
        `/handover/${vehicleAddress}`
    );
}


export {
    API_BASE_URL,
};