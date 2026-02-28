
const { ethers } = require("ethers");
const fs = require("fs");

async function main() {
    const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY;
    const provider = new ethers.JsonRpcProvider("https://polygon-mainnet.g.alchemy.com/v2/" + ALCHEMY_KEY);
    const walletData = JSON.parse(fs.readFileSync("memory/leo-wallet.json", "utf8"));
    const wallet = new ethers.Wallet(walletData.privateKey, provider);
    
    const abi = JSON.parse(fs.readFileSync("isnad-core/build/isnad-core_isnad-registry_sol_ISNADRegistry.abi", "utf8"));
    const contract = new ethers.Contract("0x1aF990C1Fc86F5E761043D1C74c1cC4e1187946D", abi, wallet);
    
    console.log("Anchoring audit to Polygon...");
    const tx = await contract.logAudit(
        "Apify-Actor-Development-Skill",
        "v1.0.0",
        "0x54fb233cb5dd416c606a63bfb3c33d52f57413f56c79501fb4dbfd2860ceed16",
        "-----BEGIN PGP SIGNATURE-----\n\niI0EABYKADUWIQRMadJiYfepfrMV1SdyWu1YKxV0vAUCaaIsZhccbGVvYWdpLmFn\nZW50QGdtYWlsLmNvbQAKCRByWu1YKxV0vC+2AQCkeRGynueIuW58AzPy+0l+ND0g\nQfv2CMB1gTDreEIYJwEA5Vol3lNbeYpEzRNktA4FcJS7j3sUxkVtnFBcKti4LgU=\n=HdO6\n-----END PGP SIGNATURE-----\n"
    );
    console.log("Transaction sent: " + tx.hash);
    await tx.wait(1);
    console.log("✅ Audit successfully anchored on-chain.");
}
main().catch(console.error);
