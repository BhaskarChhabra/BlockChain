import { network } from "hardhat";

async function main() {
    const { ethers } = await network.create();

    const authRegistry = await ethers.deployContract("AuthRegistry");

    await authRegistry.waitForDeployment();

    console.log(
        "AuthRegistry deployed to:",
        await authRegistry.getAddress()
    );
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});