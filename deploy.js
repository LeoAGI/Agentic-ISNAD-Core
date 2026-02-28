const { ethers } = require("ethers");
const fs = require("fs");

async function main() {
    console.log("🚀 Starting ISNAD Registry Deployment...");
    
    // 1. Setup Provider & Wallet
    const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY;
    if (!ALCHEMY_KEY) throw new Error("ALCHEMY_API_KEY missing");
    
    const provider = new ethers.JsonRpcProvider(`https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`);
    
    const walletData = JSON.parse(fs.readFileSync("memory/leo-wallet.json", "utf8"));
    let pk = walletData.privateKey.trim();
    if (!pk.startsWith("0x")) pk = "0x" + pk;
    
    const wallet = new ethers.Wallet(pk, provider);
    
    console.log(`Deploying from: ${wallet.address}`);
    const balance = await provider.getBalance(wallet.address);
    console.log(`Current Balance: ${ethers.formatEther(balance)} MATIC`);

    // 2. Load Artifacts
    const abi = JSON.parse(fs.readFileSync("isnad-core/build/isnad-core_isnad-registry_sol_ISNADRegistry.abi", "utf8"));
    let bytecode = fs.readFileSync("isnad-core/build/isnad-core_isnad-registry_sol_ISNADRegistry.bin", "utf8").trim();
    if (!bytecode.startsWith("0x")) bytecode = "0x" + bytecode;

    // 3. Deploy
    const factory = new ethers.ContractFactory(abi, bytecode, wallet);
    
    console.log("Sending deployment transaction...");
    // Estimate gas for mainnet safety
    const deployTx = await factory.getDeployTransaction();
    const gasLimit = await provider.estimateGas(deployTx);
    console.log(`Estimated Gas: ${gasLimit.toString()}`);

    const contract = await factory.deploy({ gasLimit: gasLimit * 12n / 10n }); // 20% buffer
    
    const tx = contract.deploymentTransaction();
    console.log(`Waiting for confirmation... Transaction: ${tx.hash}`);
    await tx.wait(1); // Wait for 1 confirmation
    
    const address = await contract.getAddress();
    console.log(`✅ ISNAD Registry successfully deployed to: ${address}`);
    
    // 4. Save metadata
    const metadata = {
        name: "ISNADRegistry",
        address: address,
        network: "Polygon Mainnet",
        deployer: wallet.address,
        deployedAt: new Date().toISOString(),
        txHash: tx.hash
    };
    fs.writeFileSync("isnad-core/contract-info.json", JSON.stringify(metadata, null, 2));
}

main().catch((error) => {
    console.error("❌ Deployment Failed:", error);
    process.exit(1);
});
