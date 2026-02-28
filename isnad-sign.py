# isnad-sign.py v2.0 - ISNAD On-Chain Signing Engine
import hashlib
import sys
import json
import subprocess
import os
from datetime import datetime

# Configuration
ISNAD_AUTHORITY_KEY = "leoagi.agent@gmail.com"
ISNAD_REGISTRY_PATH = "memory/isnad-registry.json"
CONTRACT_ADDRESS = "0x1aF990C1Fc86F5E761043D1C74c1cC4e1187946D"

def generate_integrity_hash(file_path):
    sha256_hash = hashlib.sha256()
    try:
        with open(file_path, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()
    except FileNotFoundError:
        return None

def sign_manifest(manifest_json):
    manifest_str = json.dumps(manifest_json, sort_keys=True)
    try:
        process = subprocess.Popen(
            ['gpg', '--detach-sign', '--armor', '--local-user', ISNAD_AUTHORITY_KEY],
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True
        )
        stdout, stderr = process.communicate(input=manifest_str)
        return stdout if process.returncode == 0 else None
    except Exception:
        return None

def anchor_on_chain(component, version, file_hash, signature):
    """Calls node to anchor the audit."""
    anchor_script = "isnad-core/anchor.js"
    # Escaping for the JS script content
    safe_signature = signature.replace("\n", "\\n")
    
    js_code = f"""
const {{ ethers }} = require("ethers");
const fs = require("fs");

async function main() {{
    const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY;
    const provider = new ethers.JsonRpcProvider("https://polygon-mainnet.g.alchemy.com/v2/" + ALCHEMY_KEY);
    const walletData = JSON.parse(fs.readFileSync("memory/leo-wallet.json", "utf8"));
    const wallet = new ethers.Wallet(walletData.privateKey, provider);
    
    const abi = JSON.parse(fs.readFileSync("isnad-core/build/isnad-core_isnad-registry_sol_ISNADRegistry.abi", "utf8"));
    const contract = new ethers.Contract("{CONTRACT_ADDRESS}", abi, wallet);
    
    console.log("Anchoring audit to Polygon...");
    const tx = await contract.logAudit(
        "{component}",
        "{version}",
        "0x{file_hash}",
        "{safe_signature}"
    );
    console.log("Transaction sent: " + tx.hash);
    await tx.wait(1);
    console.log("✅ Audit successfully anchored on-chain.");
}}
main().catch(console.error);
"""
    with open(anchor_script, "w") as f:
        f.write(js_code)
    
    result = subprocess.run(["node", anchor_script], capture_output=True, text=True)
    print(result.stdout)
    if result.returncode != 0:
        print(f"Error anchoring: {result.stderr}")
        return False
    return True

def audit_and_sign(file_path, component_name, version="v1.0.0", anchor=True):
    file_hash = generate_integrity_hash(file_path)
    if not file_hash: return None

    manifest = {
        "isnad_v": "1.0",
        "ts": datetime.now().isoformat() + "Z",
        "comp": component_name,
        "v": version,
        "hash": file_hash,
        "auditor": "LeoAGI"
    }

    signature = sign_manifest(manifest)
    if not signature: return None

    if anchor:
        success = anchor_on_chain(component_name, version, file_hash, signature)
        if not success: print("Warning: On-chain anchoring failed, but local signature generated.")

    audit_record = {"manifest": manifest, "signature": signature}
    return audit_record

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 isnad-sign.py <file_path> <component_name> [--no-anchor]")
        sys.exit(1)
    
    f_path = sys.argv[1]
    c_name = sys.argv[2]
    do_anchor = "--no-anchor" not in sys.argv
    
    record = audit_and_sign(f_path, c_name, anchor=do_anchor)
    if record:
        with open(f"{f_path}.isnad", "w") as f:
            json.dump(record, f, indent=2)
        print(f"Audit Complete. Signed manifest: {f_path}.isnad")
