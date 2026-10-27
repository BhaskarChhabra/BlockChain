import {
    createChallenge,
    verifyAuthentication,
} from "./api";

import {
    getVehicleIdentity,
    signVehicleMessage,
} from "./vehicleIdentity";


// ============================================================
// REQUEST CHALLENGE
// ============================================================

export async function requestAuthentication(
    vehicleAddress,
    rsuId
) {

    return createChallenge(
        vehicleAddress,
        rsuId
    );
}


// ============================================================
// SIGN CHALLENGE WITH VEHICLE PRIVATE KEY
// ============================================================

export async function signAuthenticationChallenge(
    challenge
) {

    const identity =
        getVehicleIdentity();

    if (!identity) {
        throw new Error(
            "Vehicle identity not found."
        );
    }

    const signature =
        await signVehicleMessage(
            challenge
        );

    return {
        signature,

        signerAddress:
            identity.address,
    };
}


// ============================================================
// SEND SIGNATURE TO BACKEND
// ============================================================

export async function authenticateVehicle(
    vehicleAddress,
    signature
) {

    return verifyAuthentication(
        vehicleAddress,
        signature
    );
}