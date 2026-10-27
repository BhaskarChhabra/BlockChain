require("dotenv").config();

const key = process.env.PRIVATE_KEY?.trim();

console.log("Loaded:", !!key);
console.log("Length:", key ? key.length : 0);
console.log(
    "Valid:",
    key ? /^0x[0-9a-fA-F]{64}$/.test(key) : false
);
