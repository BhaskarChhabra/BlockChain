import { ethers } from "ethers";


// ============================================================
// META MASK CONNECTION
// ============================================================

export async function connectWallet() {

    if (!window.ethereum) {
        throw new Error(
            "No browser Ethereum wallet detected."
        );
    }

    const provider =
        new ethers.BrowserProvider(
            window.ethereum
        );

    await provider.send(
        "eth_requestAccounts",
        []
    );

    const signer =
        await provider.getSigner();

    const address =
        await signer.getAddress();

    return {
        provider,
        signer,
        address,
    };
}


// ============================================================
// VEHICLE WALLET CONNECTION
// ============================================================
// Kept as a separate exported name because Topbar.jsx
// currently imports connectVehicleWallet.
//
// Note:
// Our actual simulated vehicle identity is handled by
// vehicleIdentity.js. This function is for the browser wallet
// / MetaMask side of the application.
// ============================================================

export async function connectVehicleWallet() {
    return connectWallet();
}


// ============================================================
// CURRENT METAMASK ADDRESS
// ============================================================

export async function getWalletAddress() {

    if (!window.ethereum) {
        return null;
    }

    const provider =
        new ethers.BrowserProvider(
            window.ethereum
        );

    const accounts =
        await provider.send(
            "eth_accounts",
            []
        );

    return accounts.length
        ? accounts[0]
        : null;
}


// ============================================================
// SIGN MESSAGE WITH METAMASK
// ============================================================

export async function signChallenge(
    signer,
    challenge
) {

    if (!signer) {
        throw new Error(
            "Wallet signer is not available."
        );
    }

    return signer.signMessage(
        challenge
    );
}


// ============================================================
// RECOVER ADDRESS FROM SIGNATURE
// ============================================================

export function recoverSigner(
    message,
    signature
) {

    return ethers.verifyMessage(
        message,
        signature
    );
}