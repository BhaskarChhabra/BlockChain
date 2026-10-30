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
                "Content-Type": "application/json",
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
        const error = new Error(
            data.error ||
            data.message ||
            `Request failed (${response.status})`
        );
        error.status = response.status;
        error.data = data;
        throw error;
    }

    return data;
}

// ============================================================
// DASHBOARD & BLOCKCHAIN
// ============================================================

export function getBlockchainStatus() {
    return request("/blockchain");
}

export function getDashboardStats() {
    return request("/stats");
}

// ============================================================
// VEHICLES
// ============================================================

export function getVehicles() {
    return request("/vehicles");
}

export function getVehicle(address) {
    return request(`/vehicle/${address}`);
}

export function registerVehicle(
    vehicleAddress,
    publicKeyHash,
    vehicleName = ""
) {
    return request(
        "/register",
        {
            method: "POST",
            body: JSON.stringify({
                vehicleAddress,
                publicKeyHash,
                vehicleName,
            }),
        }
    );
}

export function revokeVehicle(vehicleAddress) {
    return request(
        "/revoke",
        {
            method: "POST",
            body: JSON.stringify({
                vehicleAddress,
            }),
        }
    );
}

export function deactivateVehicle(vehicleAddress, reason = "Administrative Deactivation") {
    return request(
        "/deactivate",
        {
            method: "POST",
            body: JSON.stringify({
                vehicleAddress,
                reason,
            }),
        }
    );
}

export function updateVehicleName(vehicleAddress, name) {
    return request(
        "/vehicle/name",
        {
            method: "POST",
            body: JSON.stringify({
                vehicleAddress,
                name,
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
    location,
    rsuAddress
) {
    return request(
        "/rsus",
        {
            method: "POST",
            body: JSON.stringify({
                rsuId,
                location,
                rsuAddress,
            }),
        }
    );
}

export function setRSUStatus(rsuId, active) {
    return request(
        "/rsus/status",
        {
            method: "POST",
            body: JSON.stringify({
                rsuId,
                active,
            }),
        }
    );
}

export function deactivateRSU(rsuId) {
    return setRSUStatus(rsuId, false);
}

// ============================================================
// MUTUAL AUTHENTICATION
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
    currentRsuId,
    targetRsuId,
    signature,
    message
) {
    return request(
        "/handover",
        {
            method: "POST",
            body: JSON.stringify({
                vehicleAddress,
                currentRsuId,
                targetRsuId,
                signature,
                message,
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

export function getHandoverHistory() {
    return request("/handovers");
}


// ============================================================
// PERFORMANCE & BENCHMARKING
// ============================================================

export function getPerformanceSummary() {
    return request("/performance/summary");
}

export function getPerformanceHistory(params = {}) {
    const qs = new URLSearchParams();
    if (params.operation) qs.append("operation", params.operation);
    if (params.status) qs.append("status", params.status);
    if (params.limit) qs.append("limit", params.limit);
    const query = qs.toString() ? `?${qs.toString()}` : "";
    return request(`/performance/history${query}`);
}

export function recordPerformanceMetric(record) {
    return request("/performance/record", {
        method: "POST",
        body: JSON.stringify(record),
    });
}

export function clearPerformanceHistory() {
    return request("/performance/history", {
        method: "DELETE",
    });
}

export {
    API_BASE_URL,
};
