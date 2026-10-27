import { ethers } from "ethers";

const STORAGE_KEY =
    "vchain_vehicle_identity";


// ============================================================
// CREATE A REAL VEHICLE IDENTITY
// ============================================================

export function createVehicleIdentity() {

    const wallet =
        ethers.Wallet.createRandom();

    const identity = {
        address: wallet.address,

        privateKey: wallet.privateKey,

        publicKey:
            wallet.signingKey.publicKey,

        publicKeyHash:
            ethers.keccak256(
                wallet.signingKey.publicKey
            ),

        createdAt:
            Date.now(),
    };

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(identity)
    );

    return identity;
}


// ============================================================
// GET CURRENT VEHICLE IDENTITY
// ============================================================

export function getVehicleIdentity() {

    const stored =
        localStorage.getItem(
            STORAGE_KEY
        );

    if (!stored) {
        return null;
    }

    try {
        return JSON.parse(stored);
    } catch {
        localStorage.removeItem(
            STORAGE_KEY
        );

        return null;
    }
}


// ============================================================
// GET WALLET INSTANCE
// ============================================================

export function getVehicleWallet() {

    const identity =
        getVehicleIdentity();

    if (!identity?.privateKey) {
        return null;
    }

    return new ethers.Wallet(
        identity.privateKey
    );
}


// ============================================================
// SIGN AUTHENTICATION MESSAGE
// ============================================================

export async function signVehicleMessage(
    message
) {

    const wallet =
        getVehicleWallet();

    if (!wallet) {
        throw new Error(
            "No vehicle identity exists. Create a vehicle identity first."
        );
    }

    return wallet.signMessage(
        message
    );
}


// ============================================================
// VERIFY LOCALLY
// ============================================================

export function recoverVehicleAddress(
    message,
    signature
) {

    return ethers.verifyMessage(
        message,
        signature
    );
}


// ============================================================
// DELETE LOCAL IDENTITY
// ============================================================

export function clearVehicleIdentity() {

    localStorage.removeItem(
        STORAGE_KEY
    );
}