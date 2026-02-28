# isnad-verify.py - ISNAD Core Verification Engine

import hashlib
import sys
import json
import subprocess
from datetime import datetime

def generate_integrity_hash(file_path):
    """Generates a SHA-256 hash for a file."""
    sha256_hash = hashlib.sha256()
    try:
        with open(file_path, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()
    except FileNotFoundError:
        return None

def verify_signature(manifest_json, signature_str):
    """Verifies the GPG signature of a manifest."""
    manifest_str = json.dumps(manifest_json, sort_keys=True)
    try:
        # Use gpg to verify the signature
        # We need to provide the manifest as a file and the signature as a file
        with open("temp_manifest.json", "w") as f:
            f.write(manifest_str)
        with open("temp_signature.asc", "w") as f:
            f.write(signature_str)
            
        process = subprocess.Popen(
            ['gpg', '--verify', 'temp_signature.asc', 'temp_manifest.json'],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        stdout, stderr = process.communicate()
        
        # Clean up
        import os
        os.remove("temp_manifest.json")
        os.remove("temp_signature.asc")

        if process.returncode == 0:
            return True, stdout
        else:
            return False, stderr
    except Exception as e:
        return False, str(e)

def verify_isnad_file(file_path, isnad_file_path):
    """Full verification: hash check + signature check."""
    try:
        with open(isnad_file_path, "r") as f:
            isnad_data = json.load(f)
    except Exception as e:
        print(f"Error: Could not load {isnad_file_path}: {e}")
        return False

    manifest = isnad_data.get("manifest")
    signature = isnad_data.get("signature")

    if not manifest or not signature:
        print("Error: Invalid ISNAD file format.")
        return False

    # 1. Check Hash
    actual_hash = generate_integrity_hash(file_path)
    if actual_hash != manifest.get("hash"):
        print(f"FAILED: Hash mismatch! Expected {manifest.get('hash')}, got {actual_hash}")
        return False

    # 2. Check Signature
    success, message = verify_signature(manifest, signature)
    if success:
        print(f"SUCCESS: {manifest.get('comp')} is VERIFIED.")
        print(f"Auditor: {manifest.get('auditor')}")
        print(f"Timestamp: {manifest.get('ts')}")
        return True
    else:
        print(f"FAILED: Signature verification failed.\n{message}")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 isnad-verify.py <file_path> <isnad_file_path>")
        sys.exit(1)
        
    f_path = sys.argv[1]
    isnad_path = sys.argv[2]
    
    verify_isnad_file(f_path, isnad_path)
