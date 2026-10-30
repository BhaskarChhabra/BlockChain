import { ethers } from "ethers";

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
// VEHICLE VERIFIES RSU PROOF (MUTUAL AUTH)
// ============================================================

export function verifyRsuProof(
    rsuProof,
    expectedRsuAddress
) {
    if (
        !rsuProof ||
        !rsuProof.message ||
        !rsuProof.signature ||
        !expectedRsuAddress
    ) {
        return {
            valid: false,
            error: "Missing RSU cryptographic proof material.",
        };
    }

    try {
        const recovered = ethers.verifyMessage(
            rsuProof.message,
            rsuProof.signature
        );

        const valid =
            recovered.toLowerCase() ===
            expectedRsuAddress.toLowerCase();

        return {
            valid,
            recoveredAddress: recovered,
            expectedAddress: expectedRsuAddress,
        };
    } catch (err) {
        return {
            valid: false,
            error: err.message,
        };
    }
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