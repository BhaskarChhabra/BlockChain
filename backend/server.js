require("dotenv").config();

const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");
const {
    recordBenchmarkEntry,
    clearPerformanceHistory,
    getPerformanceSummary,
    loadPerformanceStore,
    syncBlockchainHistoricalEvents,
} = require("./performance/performanceService");


const {
    contract,
    provider,
    wallet,
} = require("./blockchain/contract");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = 5001;

// ============================================================
// VEHICLE METADATA & NAME PERSISTENCE STORE
// ============================================================

const DATA_DIR = path.join(__dirname, "data");
const STORE_FILE = path.join(DATA_DIR, "vehicleStore.json");

if (!fs.existsSync(DATA_DIR)) {
    try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch (e) {
        console.warn("Notice: Unable to create data dir:", e.message);
    }
}

function loadVehicleStore() {
    try {
        if (fs.existsSync(STORE_FILE)) {
            const raw = fs.readFileSync(STORE_FILE, "utf-8");
            return JSON.parse(raw);
        }
    } catch (e) {
        console.error("Error reading vehicleStore.json:", e.message);
    }
    return { names: {}, metadata: {} };
}

function saveVehicleStore(data) {
    try {
        fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), "utf-8");
    } catch (e) {
        console.error("Error writing vehicleStore.json:", e.message);
    }
}

function getVehicleName(address, index = 0) {
    if (!address) return `Vehicle-${index + 1}`;
    const store = loadVehicleStore();
    const key = address.toLowerCase();
    if (store.names && store.names[key]) {
        return store.names[key];
    }
    return `Vehicle-${index + 1}`;
}

function setVehicleName(address, name) {
    if (!address || !name) return;
    const store = loadVehicleStore();
    if (!store.names) store.names = {};
    store.names[address.toLowerCase()] = name.trim();
    saveVehicleStore(store);
}

function setVehicleMetadata(address, meta) {
    if (!address) return;
    const store = loadVehicleStore();
    if (!store.metadata) store.metadata = {};
    const key = address.toLowerCase();
    store.metadata[key] = {
        ...(store.metadata[key] || {}),
        ...meta,
    };
    saveVehicleStore(store);
}

function getVehicleMetadata(address) {
    if (!address) return {};
    const store = loadVehicleStore();
    const key = address.toLowerCase();
    return (store.metadata && store.metadata[key]) || {};
}

// ============================================================
// PRE-DEFINED RSU KEYPAIRS (Local Testnet Keys)
// ============================================================

const RSU_REGISTRY_KEYS = {
    "RSU-01": {
        privateKey: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
        address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        location: "University Gate (Campus Entrance)",
    },
    "RSU-02": {
        privateKey: "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
        address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        location: "Main Highway (NH-27 Corridor)",
    },
    "RSU-03": {
        privateKey: "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
        address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
        location: "City Center (Downtown Junction)",
    },
    "RSU-04": {
        privateKey: "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a",
        address: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
        location: "Airport Road (Express Highway)",
    },
};

const dynamicRsuWallets = new Map();

function getRsuWallet(rsuId) {
    if (RSU_REGISTRY_KEYS[rsuId]) {
        return new ethers.Wallet(RSU_REGISTRY_KEYS[rsuId].privateKey);
    }
    if (dynamicRsuWallets.has(rsuId)) {
        return dynamicRsuWallets.get(rsuId);
    }
    const newWallet = ethers.Wallet.createRandom();
    dynamicRsuWallets.set(rsuId, newWallet);
    return newWallet;
}

// ============================================================
// TEMPORARY CHALLENGE STORE
// ============================================================

const challenges = new Map();
const CHALLENGE_TTL_MS = 60 * 1000;

// ============================================================
// HEALTH & BLOCKCHAIN STATUS
// ============================================================

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "V-CHAIN backend is running",
        topic: "Blockchain-Based Decentralized Mutual Authentication",
    });
});

app.get("/blockchain", async (req, res) => {
    try {
        const network = await provider.getNetwork();
        const blockNumber = await provider.getBlockNumber();
        const admin = await contract.admin();

        res.json({
            success: true,
            blockchainConnected: true,
            network: network.name,
            chainId: network.chainId.toString(),
            blockNumber,
            contractAddress: await contract.getAddress(),
            admin,
        });
    } catch (error) {
        console.error("Blockchain status error:", error.message);
        res.status(500).json({
            success: false,
            blockchainConnected: false,
            error: error.message,
        });
    }
});

// ============================================================
// DASHBOARD STATS
// ============================================================

app.get("/stats", async (req, res) => {
    try {
        const blockNumber = await provider.getBlockNumber();
        const network = await provider.getNetwork();
        const userAddresses = await contract.getUserAddresses();
        const allRsus = await contract.getAllRSUs();

        let activeVehicles = 0;
        let revokedVehicles = 0;

        for (const addr of userAddresses) {
            const u = await contract.getUser(addr);
            if (u[1] && !u[2]) activeVehicles++;
            if (u[2]) revokedVehicles++;
        }

        const activeRsus = allRsus.filter((r) => r[3]).length;
        const totalAuthentications = await contract.totalAuthentications();
        const totalHandovers = await contract.totalHandovers();

        res.json({
            success: true,
            blockchainConnected: true,
            network: network.name,
            chainId: network.chainId.toString(),
            blockNumber,
            contractAddress: await contract.getAddress(),
            totalVehicles: userAddresses.length,
            activeVehicles,
            revokedVehicles,
            totalRSUs: allRsus.length,
            activeRSUs: activeRsus,
            totalAuthentications: Number(totalAuthentications),
            totalHandovers: Number(totalHandovers),
        });
    } catch (error) {
        console.error("Stats error:", error.message);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

// ============================================================
// VEHICLE — REGISTER
// ============================================================

app.post("/register", async (req, res) => {
    try {
        const { vehicleAddress, publicKeyHash, vehicleName } = req.body;

        if (!vehicleAddress) {
            return res.status(400).json({
                success: false,
                error: "Vehicle wallet address is required",
            });
        }

        if (!ethers.isAddress(vehicleAddress)) {
            return res.status(400).json({
                success: false,
                error: "Invalid Ethereum address",
            });
        }

        if (!publicKeyHash) {
            return res.status(400).json({
                success: false,
                error: "Public key hash is required",
            });
        }

        if (!ethers.isHexString(publicKeyHash, 32)) {
            return res.status(400).json({
                success: false,
                error: "Public key hash must be a 32-byte hex value",
            });
        }

        const existing = await contract.getUser(vehicleAddress);

        if (existing[1]) {
            return res.status(409).json({
                success: false,
                error: "Vehicle is already registered",
            });
        }

        const tx = await contract.registerUser(vehicleAddress, publicKeyHash);
        const receipt = await tx.wait();

        // Assign human-readable vehicle name
        const addrs = await contract.getUserAddresses();
        const assignedName = (vehicleName && vehicleName.trim()) || `Vehicle-${addrs.length}`;
        setVehicleName(vehicleAddress, assignedName);

        res.json({
            success: true,
            vehicleAddress,
            name: assignedName,
            publicKeyHash,
            transactionHash: tx.hash,
            blockNumber: receipt.blockNumber,
        });
    } catch (error) {
        console.error("Vehicle registration error:", error.message);
        res.status(500).json({
            success: false,
            error: error.reason || error.shortMessage || error.message,
        });
    }
});

// ============================================================
// VEHICLE — SET / UPDATE NAME
// ============================================================

app.post("/vehicle/name", async (req, res) => {
    try {
        const { vehicleAddress, name } = req.body;

        if (!vehicleAddress || !ethers.isAddress(vehicleAddress)) {
            return res.status(400).json({
                success: false,
                error: "Valid vehicle address is required",
            });
        }

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                error: "Vehicle name is required",
            });
        }

        const user = await contract.getUser(vehicleAddress);
        if (!user[1]) {
            return res.status(404).json({
                success: false,
                error: "Vehicle is not registered on blockchain",
            });
        }

        setVehicleName(vehicleAddress, name.trim());

        res.json({
            success: true,
            vehicleAddress,
            name: name.trim(),
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

// ============================================================
// VEHICLE — DEACTIVATE / REVOKE
// ============================================================

async function handleVehicleDeactivation(req, res, defaultReason = "Administrative Deactivation") {
    try {
        const { vehicleAddress, reason } = req.body;

        if (!vehicleAddress || !ethers.isAddress(vehicleAddress)) {
            return res.status(400).json({
                success: false,
                error: "Valid vehicle address is required",
            });
        }

        const user = await contract.getUser(vehicleAddress);

        if (!user[1]) {
            return res.status(404).json({
                success: false,
                error: "Vehicle is not registered on blockchain",
            });
        }

        if (user[2]) {
            return res.status(400).json({
                success: false,
                error: "Vehicle is already inactive/revoked",
            });
        }

        const tx = await contract.revokeUser(vehicleAddress);
        const receipt = await tx.wait();

        challenges.delete(vehicleAddress.toLowerCase());

        setVehicleMetadata(vehicleAddress, {
            deactivatedAt: Date.now(),
            reason: reason || defaultReason,
        });

        res.json({
            success: true,
            vehicleAddress,
            name: getVehicleName(vehicleAddress),
            revoked: true,
            deactivated: true,
            transactionHash: tx.hash,
            blockNumber: receipt.blockNumber,
        });
    } catch (error) {
        console.error("Vehicle deactivation error:", error.message);
        res.status(500).json({
            success: false,
            error: error.reason || error.shortMessage || error.message,
        });
    }
}

app.post("/revoke", (req, res) => handleVehicleDeactivation(req, res, "Security Revocation"));
app.post("/deactivate", (req, res) => handleVehicleDeactivation(req, res, "Administrative Deactivation"));
app.post("/vehicle/deactivate", (req, res) => handleVehicleDeactivation(req, res, "Administrative Deactivation"));

// ============================================================
// VEHICLE — GET ONE
// ============================================================

app.get("/vehicle/:address", async (req, res) => {
    try {
        const address = req.params.address;

        if (!ethers.isAddress(address)) {
            return res.status(400).json({
                success: false,
                error: "Invalid vehicle address",
            });
        }

        const user = await contract.getUser(address);
        const name = getVehicleName(address);
        const meta = getVehicleMetadata(address);

        res.json({
            success: true,
            vehicleAddress: address,
            name,
            publicKeyHash: user[0],
            registered: user[1],
            revoked: user[2],
            registeredAt: Number(user[3]),
            metadata: meta,
        });
    } catch (error) {
        console.error("Vehicle lookup error:", error.message);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

// ============================================================
// VEHICLES — GET ALL
// ============================================================

app.get("/vehicles", async (req, res) => {
    try {
        const addrs = await contract.getUserAddresses();
        const vehicles = [];

        let eventMap = new Map();
        try {
            const filter = contract.filters.UserRegistered();
            const events = await contract.queryFilter(filter, 0, "latest");
            for (const ev of events) {
                if (ev.args && ev.args[0]) {
                    eventMap.set(ev.args[0].toLowerCase(), {
                        transactionHash: ev.transactionHash,
                        blockNumber: ev.blockNumber,
                    });
                }
            }
        } catch (e) {}

        for (let i = 0; i < addrs.length; i++) {
            const addr = addrs[i];
            const evData = eventMap.get(addr.toLowerCase()) || {};
            const user = await contract.getUser(addr);
            const name = getVehicleName(addr, i);
            const meta = getVehicleMetadata(addr);

            vehicles.push({
                name,
                vehicleAddress: addr,
                publicKeyHash: user[0],
                registered: user[1],
                revoked: user[2],
                registeredAt: Number(user[3]),
                transactionHash: evData.transactionHash || null,
                blockNumber: evData.blockNumber || null,
                metadata: meta,
            });
        }

        res.json({
            success: true,
            count: vehicles.length,
            vehicles,
        });
    } catch (error) {
        console.error("Vehicle list error:", error.message);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

// ============================================================
// RSU — REGISTER
// ============================================================

app.post("/rsus", async (req, res) => {
    try {
        const { rsuId, location, rsuAddress } = req.body;

        if (!rsuId || !location) {
            return res.status(400).json({
                success: false,
                error: "RSU ID and location are required",
            });
        }

        const existing = await contract.getRSU(rsuId);

        if (existing[0]) {
            return res.status(409).json({
                success: false,
                error: "RSU already exists",
            });
        }

        const rsuWallet = getRsuWallet(rsuId);
        const assignedAddress =
            rsuAddress && ethers.isAddress(rsuAddress)
                ? rsuAddress
                : rsuWallet.address;

        const tx = await contract.registerRSU(
            rsuId,
            assignedAddress,
            location
        );

        const receipt = await tx.wait();

        res.json({
            success: true,
            rsuId,
            rsuAddress: assignedAddress,
            location,
            active: true,
            transactionHash: tx.hash,
            blockNumber: receipt.blockNumber,
        });
    } catch (error) {
        console.error("RSU registration error:", error.message);
        res.status(500).json({
            success: false,
            error: error.reason || error.shortMessage || error.message,
        });
    }
});

// ============================================================
// RSU — SET STATUS (ACTIVATE / DEACTIVATE)
// ============================================================

async function handleRsuStatusChange(req, res) {
    try {
        const rsuId = req.params.id || req.body.rsuId;
        const active = req.body.active !== undefined ? Boolean(req.body.active) : false;

        if (!rsuId) {
            return res.status(400).json({
                success: false,
                error: "RSU ID is required",
            });
        }

        const existing = await contract.getRSU(rsuId);

        if (!existing[0] || existing[0] === "") {
            return res.status(404).json({
                success: false,
                error: "RSU does not exist on blockchain",
            });
        }

        if (existing[3] === active) {
            return res.status(400).json({
                success: false,
                error: `RSU ${rsuId} is already ${active ? "active" : "inactive"}`,
            });
        }

        const tx = await contract.setRSUStatus(rsuId, active);
        const receipt = await tx.wait();

        res.json({
            success: true,
            rsuId,
            active,
            transactionHash: tx.hash,
            blockNumber: receipt.blockNumber,
            message: `RSU ${rsuId} status successfully updated to ${active ? "ACTIVE" : "INACTIVE"} on blockchain`,
        });
    } catch (error) {
        console.error("RSU status update error:", error.message);
        res.status(500).json({
            success: false,
            error: error.reason || error.shortMessage || error.message,
        });
    }
}

app.post("/rsus/status", handleRsuStatusChange);
app.post("/rsus/:id/status", handleRsuStatusChange);
app.post("/rsus/:id/deactivate", (req, res) => {
    req.body.active = false;
    return handleRsuStatusChange(req, res);
});

// ============================================================
// RSU — GET ALL
// ============================================================

app.get("/rsus", async (req, res) => {
    try {
        const result = await contract.getAllRSUs();

        const rsus = result.map((rsu) => ({
            id: rsu[0],
            rsuAddress: rsu[1],
            location: rsu[2],
            active: rsu[3],
            registeredAt: Number(rsu[4]),
        }));

        res.json({
            success: true,
            count: rsus.length,
            rsus,
        });
    } catch (error) {
        console.error("RSU lookup error:", error.message);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

// ============================================================
// MUTUAL AUTHENTICATION — CHALLENGE
// ============================================================

app.post("/authenticate/challenge", async (req, res) => {
    try {
        const { vehicleAddress, rsuId } = req.body;

        if (!vehicleAddress || !ethers.isAddress(vehicleAddress)) {
            return res.status(400).json({
                success: false,
                error: "Valid vehicle address is required",
            });
        }

        if (!rsuId) {
            return res.status(400).json({
                success: false,
                error: "RSU ID is required",
            });
        }

        const authenticated = await contract.isAuthenticated(vehicleAddress);

        if (!authenticated) {
            return res.status(403).json({
                success: false,
                error: "Vehicle is not an active registered identity (Deactivated or Revoked)",
            });
        }

        const rsu = await contract.getRSU(rsuId);

        if (!rsu[0] || !rsu[3]) {
            return res.status(400).json({
                success: false,
                error: "RSU does not exist or is inactive / deactivated",
            });
        }

        const rsuAddressOnChain = rsu[1];

        const vehicleNonce = crypto.randomBytes(32).toString("hex");
        const rsuNonce = crypto.randomBytes(32).toString("hex");

        const vehicleChallenge =
            `V-CHAIN V2I AUTHENTICATION: VEHICLE PROOF\n` +
            `Vehicle: ${vehicleAddress}\n` +
            `RSU: ${rsuId}\n` +
            `VehicleNonce: ${vehicleNonce}`;

        const vehicleChallengeHash = ethers.keccak256(
            ethers.toUtf8Bytes(vehicleChallenge)
        );

        const rsuProofMessage =
            `RSU PROOF: V-CHAIN V2I AUTHENTICATION\n` +
            `RSU: ${rsuId}\n` +
            `Vehicle: ${vehicleAddress}\n` +
            `RSUNonce: ${rsuNonce}\n` +
            `VehicleNonce: ${vehicleNonce}`;

        const rsuWallet = getRsuWallet(rsuId);
        const rsuSignature = await rsuWallet.signMessage(rsuProofMessage);

        const expiresAt = Date.now() + CHALLENGE_TTL_MS;

        challenges.set(vehicleAddress.toLowerCase(), {
            challenge: vehicleChallenge,
            challengeHash: vehicleChallengeHash,
            vehicleNonce,
            rsuNonce,
            rsuId,
            rsuAddress: rsuAddressOnChain,
            expiresAt,
        });

        res.json({
            success: true,
            challenge: vehicleChallenge,
            challengeHash: vehicleChallengeHash,
            vehicleAddress,
            rsuId,
            rsuAddress: rsuAddressOnChain,
            rsuProof: {
                message: rsuProofMessage,
                signature: rsuSignature,
                signerAddress: rsuWallet.address,
            },
            expiresAt,
        });
    } catch (error) {
        console.error("Challenge error:", error.message);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

// ============================================================
// MUTUAL AUTHENTICATION — VERIFY & RECORD
// ============================================================

app.post("/authenticate/verify", async (req, res) => {
    const reqStartTime = process.hrtime.bigint();
    try {
        const { vehicleAddress, signature } = req.body;

        if (!vehicleAddress || !ethers.isAddress(vehicleAddress)) {
            return res.status(400).json({
                success: false,
                error: "Valid vehicle address is required",
            });
        }

        if (!signature) {
            return res.status(400).json({
                success: false,
                error: "Vehicle signature is required",
            });
        }

        const key = vehicleAddress.toLowerCase();
        const pending = challenges.get(key);

        if (!pending) {
            return res.status(400).json({
                success: false,
                error: "No active authentication challenge",
            });
        }

        if (Date.now() > pending.expiresAt) {
            challenges.delete(key);
            return res.status(400).json({
                success: false,
                error: "Authentication challenge expired",
            });
        }

        const recoveredAddress = ethers.verifyMessage(
            pending.challenge,
            signature
        );

        if (recoveredAddress.toLowerCase() !== vehicleAddress.toLowerCase()) {
            challenges.delete(key);
            recordBenchmarkEntry({
                operation: "Authentication",
                vehicleAddress,
                vehicleName: getVehicleName(vehicleAddress),
                rsuId: pending.rsuId,
                status: "Security Rejection",
                outcomeCategory: "Invalid signature",
                error: "Signature does not belong to the vehicle",
                timings: { apiLatencyMs: Math.round(Number(process.hrtime.bigint() - reqStartTime) / 1e6) },
            });
            return res.status(401).json({
                success: false,
                authenticated: false,
                error: "Signature does not belong to the vehicle",
                recoveredAddress,
            });
        }

        const stillAuthenticated = await contract.isAuthenticated(
            vehicleAddress
        );

        if (!stillAuthenticated) {
            challenges.delete(key);
            recordBenchmarkEntry({
                operation: "Authentication",
                vehicleAddress,
                vehicleName: getVehicleName(vehicleAddress),
                rsuId: pending.rsuId,
                status: "Security Rejection",
                outcomeCategory: "Revoked vehicle",
                error: "Vehicle is no longer authenticated on blockchain (Deactivated or Revoked)",
                timings: { apiLatencyMs: Math.round(Number(process.hrtime.bigint() - reqStartTime) / 1e6) },
            });
            return res.status(403).json({
                success: false,
                authenticated: false,
                error: "Vehicle is no longer authenticated on blockchain (Deactivated or Revoked)",
            });
        }

        // Verify RSU is still active
        const rsu = await contract.getRSU(pending.rsuId);
        if (!rsu[0] || !rsu[3]) {
            challenges.delete(key);
            return res.status(400).json({
                success: false,
                authenticated: false,
                error: "RSU is no longer active",
            });
        }

        const submissionStart = process.hrtime.bigint();
        const tx = await contract.recordAuthentication(
            vehicleAddress,
            pending.rsuId
        );
        const submissionMs = Math.round(Number(process.hrtime.bigint() - submissionStart) / 1e6);

        const receipt = await tx.wait();
        const totalMs = Math.round(Number(process.hrtime.bigint() - reqStartTime) / 1e6);
        const confirmMs = Math.max(0, totalMs - submissionMs);
        challenges.delete(key);

        recordBenchmarkEntry({
            operation: "Authentication",
            vehicleAddress,
            vehicleName: getVehicleName(vehicleAddress),
            rsuId: pending.rsuId,
            status: "Success",
            outcomeCategory: "Successful authentication",
            timings: {
                backendVerifyMs: submissionMs,
                txConfirmationMs: confirmMs,
                apiLatencyMs: totalMs,
                totalLatencyMs: totalMs,
            },
            blockchain: {
                txHash: tx.hash,
                blockNumber: receipt.blockNumber,
                gasUsed: Number(receipt.gasUsed),
            },
        });

        res.json({
            success: true,
            authenticated: true,
            mutualVerified: true,
            vehicleAddress,
            name: getVehicleName(vehicleAddress),
            recoveredAddress,
            rsuId: pending.rsuId,
            rsuAddress: pending.rsuAddress,
            challengeHash: pending.challengeHash,
            transactionHash: tx.hash,
            blockNumber: receipt.blockNumber,
        });
    } catch (error) {
        console.error("Authentication verification error:", error.message);
        res.status(500).json({
            success: false,
            authenticated: false,
            error: error.reason || error.shortMessage || error.message,
        });
    }
});

// ============================================================
// LAST AUTHENTICATION
// ============================================================

app.get("/authenticate/:address", async (req, res) => {
    try {
        const address = req.params.address;
        const result = await contract.getLastAuthentication(address);

        res.json({
            success: true,
            rsuId: result[0],
            timestamp: Number(result[1]),
            successful: result[2],
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

// ============================================================
// RSU HANDOVER
// ============================================================

app.post("/handover", async (req, res) => {
    const reqStartTime = process.hrtime.bigint();
    try {
        const { vehicleAddress, currentRsuId, targetRsuId, signature, message } = req.body;

        if (!vehicleAddress || !ethers.isAddress(vehicleAddress)) {
            return res.status(400).json({
                success: false,
                error: "Valid vehicle address is required",
            });
        }

        if (!targetRsuId) {
            return res.status(400).json({
                success: false,
                error: "Target RSU ID is required",
            });
        }

        if (currentRsuId && currentRsuId === targetRsuId) {
            return res.status(400).json({
                success: false,
                error: "Target RSU must be different from current RSU",
            });
        }

        const authenticated = await contract.isAuthenticated(vehicleAddress);

        if (!authenticated) {
            return res.status(403).json({
                success: false,
                error: "Vehicle is not authenticated or has been deactivated/revoked",
            });
        }

        const targetRsu = await contract.getRSU(targetRsuId);

        if (!targetRsu[0] || !targetRsu[3]) {
            return res.status(400).json({
                success: false,
                error: "Target RSU does not exist or is inactive / deactivated",
            });
        }

        // Validate vehicle handover authorization signature
        if (!signature || !message) {
            return res.status(400).json({
                success: false,
                error: "Vehicle handover authorization signature and message are required",
            });
        }

        const recoveredAddress = ethers.verifyMessage(message, signature);

        if (recoveredAddress.toLowerCase() !== vehicleAddress.toLowerCase()) {
            return res.status(401).json({
                success: false,
                error: "Handover signature does not belong to the vehicle",
                recoveredAddress,
            });
        }

        const submissionStart = process.hrtime.bigint();
        const tx = await contract.recordHandover(vehicleAddress, targetRsuId);
        const submissionMs = Math.round(Number(process.hrtime.bigint() - submissionStart) / 1e6);
        const receipt = await tx.wait();
        const totalMs = Math.round(Number(process.hrtime.bigint() - reqStartTime) / 1e6);

        recordBenchmarkEntry({
            operation: "Handover",
            vehicleAddress,
            vehicleName: getVehicleName(vehicleAddress),
            rsuId: targetRsuId,
            status: "Success",
            outcomeCategory: "Handover successful",
            timings: {
                backendVerifyMs: submissionMs,
                txConfirmationMs: Math.max(0, totalMs - submissionMs),
                apiLatencyMs: totalMs,
                totalLatencyMs: totalMs,
            },
            blockchain: {
                txHash: tx.hash,
                blockNumber: receipt.blockNumber,
                gasUsed: Number(receipt.gasUsed),
            },
        });

        res.json({
            success: true,
            vehicleAddress,
            name: getVehicleName(vehicleAddress),
            fromRsu: currentRsuId || "Source RSU",
            toRsu: targetRsuId,
            transactionHash: tx.hash,
            blockNumber: receipt.blockNumber,
        });
    } catch (error) {
        console.error("Handover error:", error.message);
        res.status(500).json({
            success: false,
            error: error.reason || error.shortMessage || error.message,
        });
    }
});

// ============================================================
// LAST HANDOVER
// ============================================================

app.get("/handover/:address", async (req, res) => {
    try {
        const result = await contract.getLastHandover(req.params.address);

        res.json({
            success: true,
            rsuId: result[0],
            timestamp: Number(result[1]),
            successful: result[2],
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

// ============================================================
// HANDOVER HISTORY (EVENT LOGS)
// ============================================================

app.get("/handovers", async (req, res) => {
    try {
        const filter = contract.filters.HandoverRecorded();
        const events = await contract.queryFilter(filter, 0, "latest");

        const handovers = events.map((event) => {
            const vehicleAddr = event.args[0];
            return {
                vehicleAddress: vehicleAddr,
                name: getVehicleName(vehicleAddr),
                targetRsuId: event.args[1],
                timestamp: Number(event.args[2]),
                transactionHash: event.transactionHash,
                blockNumber: event.blockNumber,
            };
        }).reverse();

        res.json({
            success: true,
            total: handovers.length,
            handovers,
        });
    } catch (error) {
        console.error("Get handovers history error:", error.message);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

// ============================================================
// SEED DEFAULT RSUS ON STARTUP
// ============================================================

async function seedDefaultRSUs() {
    try {
        for (const [id, info] of Object.entries(RSU_REGISTRY_KEYS)) {
            const existing = await contract.getRSU(id);
            if (!existing[0] || existing[0] === "") {
                const tx = await contract.registerRSU(id, info.address, info.location);
                await tx.wait();
            }
        }
    } catch (err) {
        // Silently skip if already registered or network momentarily busy
    }
}


// ============================================================
// PERFORMANCE & BENCHMARKING APIS
// ============================================================

app.get("/performance/summary", (req, res) => {
    try {
        const data = getPerformanceSummary();
        res.json({ success: true, ...data });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get("/performance/history", (req, res) => {
    try {
        const { operation, status, limit } = req.query;
        const store = loadPerformanceStore();
        let records = store.records || [];

        if (operation && operation !== "all") {
            records = records.filter(r => r.operation.toLowerCase() === operation.toLowerCase());
        }
        if (status && status !== "all") {
            records = records.filter(r => r.status.toLowerCase() === status.toLowerCase());
        }
        const max = limit ? parseInt(limit, 10) : 100;
        res.json({
            success: true,
            total: records.length,
            records: records.slice(0, max),
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post("/performance/record", async (req, res) => {
    try {
        const entry = req.body;
        if (!entry || !entry.operation) {
            return res.status(400).json({ success: false, error: "Operation is required" });
        }

        // Validate receipt if txHash provided
        if (entry.blockchain && entry.blockchain.txHash && (!entry.blockchain.gasUsed || entry.blockchain.gasUsed === 0)) {
            try {
                const receipt = await provider.getTransactionReceipt(entry.blockchain.txHash);
                if (receipt) {
                    entry.blockchain.gasUsed = Number(receipt.gasUsed);
                    entry.blockchain.blockNumber = receipt.blockNumber;
                }
            } catch (receiptErr) {
                console.warn("Could not fetch receipt for tx:", entry.blockchain.txHash);
            }
        }

        if (entry.vehicleAddress && (!entry.vehicleName || entry.vehicleName === "Vehicle")) {
            entry.vehicleName = getVehicleName(entry.vehicleAddress);
        }

        const saved = recordBenchmarkEntry(entry);
        res.json({ success: true, record: saved });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.delete("/performance/history", (req, res) => {
    try {
        const result = clearPerformanceHistory();
        res.json(result);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ============================================================
// START SERVER
// ============================================================

app.listen(PORT, async () => {
    console.log(`V-CHAIN backend running on http://localhost:${PORT}`);
    await seedDefaultRSUs();
    await syncBlockchainHistoricalEvents(contract, provider, getVehicleName);
});
