// import { defineConfig } from "hardhat/config";
// import hardhatEthers from "@nomicfoundation/hardhat-ethers";

// export default defineConfig({
//   plugins: [hardhatEthers],

//   paths: {
//     sources: "./contracts",
//   },

//   solidity: {
//     version: "0.8.34",
//   },
// });
import { defineConfig } from "hardhat/config";
import hardhatEthers from "@nomicfoundation/hardhat-ethers";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [hardhatEthers],

  paths: {
    sources: "./contracts",
  },

  networks: {
    localhost: {
      type: "http",
      url: "http://127.0.0.1:8545",
    },
  },

  solidity: {
    version: "0.8.34",
    path: fileURLToPath(
      new URL("./node_modules/solc/soljson.js", import.meta.url)
    ),
  },
});