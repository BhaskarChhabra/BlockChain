require("dotenv").config();

const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const { ethers } = require("ethers");

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
// TEMPORARY CHALLENGE STORE
// ============================================================

const challenges = new Map();

const CHALLENGE_TTL_MS = 60 * 1000;


// ============================================================
// HEALTH
// ============================================================

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "V-CHAIN backend is running",
    });
});


// ============================================================
// BLOCKCHAIN STATUS
// ============================================================

app.get("/blockchain", async (req, res) => {
    try {
        const network =
            await provider.getNetwork();

        const blockNumber =
            await provider.getBlockNumber();

        const admin =
            await contract.admin();

        res.json({
            success: true,
            blockchainConnected: true,
            network: network.name,
            chainId: network.chainId.toString(),
            blockNumber,
            contractAddress:
                await contract.getAddress(),
            admin,
        });

    } catch (error) {
        console.error(
            "Blockchain status error:",
            error.message
        );

        res.status(500).json({
            success: false,
            blockchainConnected: false,
            error: error.message,
        });
    }
});


// ============================================================
// VEHICLE — REGISTER
// ============================================================

app.post("/register", async (req, res) => {
    try {

        const {
            vehicleAddress,
            publicKeyHash,
        } = req.body;

        if (!vehicleAddress) {
            return res.status(400).json({
                success: false,
                error:
                    "Vehicle wallet address is required",
            });
        }

        if (
            !ethers.isAddress(
                vehicleAddress
            )
        ) {
            return res.status(400).json({
                success: false,
                error:
                    "Invalid Ethereum address",
            });
        }

        if (!publicKeyHash) {
            return res.status(400).json({
                success: false,
                error:
                    "Public key hash is required",
            });
        }

        if (
            !ethers.isHexString(
                publicKeyHash,
                32
            )
        ) {
            return res.status(400).json({
                success: false,
                error:
                    "Public key hash must be a 32-byte hex value",
            });
        }

        const existing =
            await contract.getUser(
                vehicleAddress
            );

        if (existing[1]) {
            return res.status(409).json({
                success: false,
                error:
                    "Vehicle is already registered",
            });
        }

        const tx =
            await contract.registerUser(
                vehicleAddress,
                publicKeyHash
            );

        const receipt =
            await tx.wait();

        res.json({
            success: true,
            vehicleAddress,
            publicKeyHash,
            transactionHash: tx.hash,
            blockNumber:
                receipt.blockNumber,
        });

    } catch (error) {

        console.error(
            "Vehicle registration error:",
            error.message
        );

        res.status(500).json({
            success: false,
            error:
                error.reason ||
                error.shortMessage ||
                error.message,
        });
    }
});


// ============================================================
// VEHICLE — GET ONE
// ============================================================

app.get(
    "/vehicle/:address",
    async (req, res) => {

        try {

            const address =
                req.params.address;

            if (
                !ethers.isAddress(address)
            ) {
                return res.status(400).json({
                    success: false,
                    error:
                        "Invalid vehicle address",
                });
            }

            const user =
                await contract.getUser(
                    address
                );

            res.json({
                success: true,

                vehicleAddress: address,

                publicKeyHash: user[0],

                registered: user[1],

                revoked: user[2],

                registeredAt:
                    Number(user[3]),
            });

        } catch (error) {

            console.error(
                "Vehicle lookup error:",
                error.message
            );

            res.status(500).json({
                success: false,
                error: error.message,
            });
        }
    }
);


// ============================================================
// VEHICLES — GET ALL FROM BLOCKCHAIN EVENTS
// ============================================================

app.get("/vehicles", async (req, res) => {

    try {

        const filter =
            contract.filters.UserRegistered();

        const events =
            await contract.queryFilter(
                filter,
                0,
                "latest"
            );

        const vehicles = [];

        for (const event of events) {

            const vehicleAddress =
                event.args[0];

            const user =
                await contract.getUser(
                    vehicleAddress
                );

            vehicles.push({
                vehicleAddress,

                publicKeyHash:
                    user[0],

                registered:
                    user[1],

                revoked:
                    user[2],

                registeredAt:
                    Number(user[3]),

                transactionHash:
                    event.transactionHash,

                blockNumber:
                    event.blockNumber,
            });
        }

        res.json({
            success: true,
            count: vehicles.length,
            vehicles,
        });

    } catch (error) {

        console.error(
            "Vehicle list error:",
            error.message
        );

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

        const {
            rsuId,
            location,
        } = req.body;

        if (!rsuId || !location) {
            return res.status(400).json({
                success: false,
                error:
                    "RSU ID and location are required",
            });
        }

        const existing =
            await contract.getRSU(
                rsuId
            );

        if (existing[0]) {
            return res.status(409).json({
                success: false,
                error:
                    "RSU already exists",
            });
        }

        const tx =
            await contract.registerRSU(
                rsuId,
                location
            );

        const receipt =
            await tx.wait();

        res.json({
            success: true,

            rsuId,

            location,

            transactionHash:
                tx.hash,

            blockNumber:
                receipt.blockNumber,
        });

    } catch (error) {

        console.error(
            "RSU registration error:",
            error.message
        );

        res.status(500).json({
            success: false,
            error:
                error.reason ||
                error.shortMessage ||
                error.message,
        });
    }
});


// ============================================================
// RSU — GET ALL
// ============================================================

app.get("/rsus", async (req, res) => {

    try {

        const result =
            await contract.getAllRSUs();

        const rsus =
            result.map((rsu) => ({
                id: rsu[0],
                location: rsu[1],
                active: rsu[2],
                registeredAt:
                    Number(rsu[3]),
            }));

        res.json({
            success: true,
            count: rsus.length,
            rsus,
        });

    } catch (error) {

        console.error(
            "RSU lookup error:",
            error.message
        );

        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});


// ============================================================
// AUTHENTICATION — CHALLENGE
// ============================================================

app.post(
    "/authenticate/challenge",
    async (req, res) => {

        try {

            const {
                vehicleAddress,
                rsuId,
            } = req.body;

            if (
                !vehicleAddress ||
                !ethers.isAddress(
                    vehicleAddress
                )
            ) {
                return res.status(400).json({
                    success: false,
                    error:
                        "Valid vehicle address is required",
                });
            }

            if (!rsuId) {
                return res.status(400).json({
                    success: false,
                    error:
                        "RSU ID is required",
                });
            }

            const authenticated =
                await contract.isAuthenticated(
                    vehicleAddress
                );

            if (!authenticated) {
                return res.status(403).json({
                    success: false,
                    error:
                        "Vehicle is not an active registered identity",
                });
            }

            const rsu =
                await contract.getRSU(
                    rsuId
                );

            if (
                !rsu[0] ||
                !rsu[2]
            ) {
                return res.status(400).json({
                    success: false,
                    error:
                        "RSU does not exist or is inactive",
                });
            }

            const nonce =
                crypto.randomBytes(32)
                    .toString("hex");

            const challenge =
                `V-CHAIN V2I AUTHENTICATION\n` +
                `Vehicle: ${vehicleAddress}\n` +
                `RSU: ${rsuId}\n` +
                `Nonce: ${nonce}`;

            const challengeHash =
                ethers.keccak256(
                    ethers.toUtf8Bytes(
                        challenge
                    )
                );

            const expiresAt =
                Date.now() +
                CHALLENGE_TTL_MS;

            challenges.set(
                vehicleAddress.toLowerCase(),
                {
                    challenge,
                    challengeHash,
                    rsuId,
                    expiresAt,
                }
            );

            res.json({
                success: true,

                challenge,

                challengeHash,

                vehicleAddress,

                rsuId,

                expiresAt,
            });

        } catch (error) {

            console.error(
                "Challenge error:",
                error.message
            );

            res.status(500).json({
                success: false,
                error: error.message,
            });
        }
    }
);


// ============================================================
// AUTHENTICATION — VERIFY
// ============================================================

app.post(
    "/authenticate/verify",
    async (req, res) => {

        try {

            const {
                vehicleAddress,
                signature,
            } = req.body;

            if (
                !vehicleAddress ||
                !ethers.isAddress(
                    vehicleAddress
                )
            ) {
                return res.status(400).json({
                    success: false,
                    error:
                        "Valid vehicle address is required",
                });
            }

            if (!signature) {
                return res.status(400).json({
                    success: false,
                    error:
                        "Signature is required",
                });
            }

            const key =
                vehicleAddress.toLowerCase();

            const pending =
                challenges.get(key);

            if (!pending) {
                return res.status(400).json({
                    success: false,
                    error:
                        "No active authentication challenge",
                });
            }

            if (
                Date.now() >
                pending.expiresAt
            ) {

                challenges.delete(key);

                return res.status(400).json({
                    success: false,
                    error:
                        "Authentication challenge expired",
                });
            }

            const recoveredAddress =
                ethers.verifyMessage(
                    pending.challenge,
                    signature
                );

            if (
                recoveredAddress.toLowerCase() !==
                vehicleAddress.toLowerCase()
            ) {

                challenges.delete(key);

                return res.status(401).json({
                    success: false,
                    authenticated: false,
                    error:
                        "Signature does not belong to the vehicle",
                    recoveredAddress,
                });
            }

            const stillAuthenticated =
                await contract.isAuthenticated(
                    vehicleAddress
                );

            if (!stillAuthenticated) {

                challenges.delete(key);

                return res.status(403).json({
                    success: false,
                    authenticated: false,
                    error:
                        "Vehicle is no longer authenticated on blockchain",
                });
            }

            const tx =
                await contract.recordAuthentication(
                    vehicleAddress,
                    pending.rsuId
                );

            const receipt =
                await tx.wait();

            challenges.delete(key);

            res.json({
                success: true,

                authenticated: true,

                vehicleAddress,

                recoveredAddress,

                rsuId:
                    pending.rsuId,

                challengeHash:
                    pending.challengeHash,

                transactionHash:
                    tx.hash,

                blockNumber:
                    receipt.blockNumber,
            });

        } catch (error) {

            console.error(
                "Authentication verification error:",
                error.message
            );

            res.status(500).json({
                success: false,
                authenticated: false,
                error:
                    error.reason ||
                    error.shortMessage ||
                    error.message,
            });
        }
    }
);


// ============================================================
// LAST AUTHENTICATION
// ============================================================

app.get(
    "/authenticate/:address",
    async (req, res) => {

        try {

            const address =
                req.params.address;

            const result =
                await contract.getLastAuthentication(
                    address
                );

            res.json({
                success: true,
                rsuId: result[0],
                timestamp:
                    Number(result[1]),
                successful:
                    result[2],
            });

        } catch (error) {

            res.status(500).json({
                success: false,
                error: error.message,
            });
        }
    }
);


// ============================================================
// HANDOVER
// ============================================================

app.post("/handover", async (req, res) => {

    try {

        const {
            vehicleAddress,
            rsuId,
        } = req.body;

        if (
            !vehicleAddress ||
            !ethers.isAddress(
                vehicleAddress
            )
        ) {
            return res.status(400).json({
                success: false,
                error:
                    "Valid vehicle address is required",
            });
        }

        if (!rsuId) {
            return res.status(400).json({
                success: false,
                error:
                    "RSU ID is required",
            });
        }

        const authenticated =
            await contract.isAuthenticated(
                vehicleAddress
            );

        if (!authenticated) {
            return res.status(403).json({
                success: false,
                error:
                    "Vehicle is not authenticated",
            });
        }

        const rsu =
            await contract.getRSU(
                rsuId
            );

        if (
            !rsu[0] ||
            !rsu[2]
        ) {
            return res.status(400).json({
                success: false,
                error:
                    "Target RSU does not exist or is inactive",
            });
        }

        const tx =
            await contract.recordHandover(
                vehicleAddress,
                rsuId
            );

        const receipt =
            await tx.wait();

        res.json({
            success: true,

            vehicleAddress,

            rsuId,

            transactionHash:
                tx.hash,

            blockNumber:
                receipt.blockNumber,
        });

    } catch (error) {

        console.error(
            "Handover error:",
            error.message
        );

        res.status(500).json({
            success: false,
            error:
                error.reason ||
                error.shortMessage ||
                error.message,
        });
    }
});


// ============================================================
// LAST HANDOVER
// ============================================================

app.get(
    "/handover/:address",
    async (req, res) => {

        try {

            const result =
                await contract.getLastHandover(
                    req.params.address
                );

            res.json({
                success: true,
                rsuId: result[0],
                timestamp:
                    Number(result[1]),
                successful:
                    result[2],
            });

        } catch (error) {

            res.status(500).json({
                success: false,
                error: error.message,
            });
        }
    }
);


// ============================================================
// START
// ============================================================

app.listen(
    PORT,
    () => {
        console.log(
            `V-CHAIN backend running on http://localhost:${PORT}`
        );
    }
);