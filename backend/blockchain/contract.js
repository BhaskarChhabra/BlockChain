const path = require("path");
const dotenv = require("dotenv");
const { ethers } = require("ethers");

dotenv.config({
    path: path.join(__dirname, "../.env"),
});

const artifact = require(
    path.join(
        __dirname,
        "../../blockchain/artifacts/contracts/AuthRegistry.sol/AuthRegistry.json"
    )
);

const RPC_URL = process.env.BLOCKCHAIN_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY?.trim();
const CONTRACT_ADDRESS =
    process.env.CONTRACT_ADDRESS?.trim();

if (!RPC_URL) {
    throw new Error(
        "BLOCKCHAIN_RPC_URL is missing from .env"
    );
}

if (!PRIVATE_KEY) {
    throw new Error(
        "PRIVATE_KEY is missing from .env"
    );
}

if (!CONTRACT_ADDRESS) {
    throw new Error(
        "CONTRACT_ADDRESS is missing from .env"
    );
}

if (!/^0x[0-9a-fA-F]{64}$/.test(PRIVATE_KEY)) {
    throw new Error(
        "PRIVATE_KEY is not a valid Ethereum private key"
    );
}

if (!ethers.isAddress(CONTRACT_ADDRESS)) {
    throw new Error(
        "CONTRACT_ADDRESS is not a valid Ethereum address"
    );
}

const provider =
    new ethers.JsonRpcProvider(RPC_URL);

const wallet =
    new ethers.Wallet(
        PRIVATE_KEY,
        provider
    );

const contract =
    new ethers.Contract(
        CONTRACT_ADDRESS,
        artifact.abi,
        wallet
    );

console.log(
    "Blockchain wallet:",
    wallet.address
);

console.log(
    "Connected contract:",
    CONTRACT_ADDRESS
);

module.exports = {
    contract,
    provider,
    wallet,
};