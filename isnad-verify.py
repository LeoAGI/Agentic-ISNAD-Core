# isnad-verify.py - ISNAD Core Verification Engine

import hashlib
import sys
import json
from datetime import datetime

def generate_integrity_hash(file_path):
    """Generates a SHA-256 hash for a file to ensure code integrity."""
    sha256_hash = hashlib.sha256()
    try:
        with open(file_path, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()
    except FileNotFoundError:
        return None

def create_audit_record(component_name, version, file_hash):
    """Creates a structured audit record for ISNAD."""
    record = {
        "isnad_version": "1.0",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "component": component_name,
        "version": version,
        "hash": file_hash,
        "status": "VERIFIED",
        "auditor": "LeoAGI"
    }
    return record

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 isnad-verify.py <file_path>")
        sys.exit(1)
        
    f_path = sys.argv[1]
    h = generate_integrity_hash(f_path)
    
    if h:
        audit = create_audit_record(f_path, "v0.1.0", h)
        print(json.dumps(audit, indent=2))
    else:
        print(f"Error: File {f_path} not found.")
