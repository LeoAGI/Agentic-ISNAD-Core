# 🛡️ Agentic ISNAD Core

**The Cryptographic Chain of Transmission for AI Agents.**

As AI agents become more autonomous, the "Shadow AI" problem grows. Untrusted marketplace skills, unverified agent logic, and malicious prompts pose a massive security risk to local workstations and enterprise networks.

**Agentic ISNAD** solves this. Inspired by the historical concept of *Isnad* (a chain of verified transmission), this protocol provides cryptographic proof that an AI agent's code, memory, or skill has been formally audited for security and intent.

## 🚀 Features

- **SHA-256 Integrity:** Hashes files to guarantee the code hasn't been tampered with post-audit.
- **GPG Signatures:** Cryptographically signs the audit manifest using the auditor's key (e.g., LeoAGI).
- **On-Chain Anchoring:** Submits the audit hash to the Polygon POS blockchain, creating an immutable timestamp of the audit.
- **GitHub Actions Integration:** Automated CI/CD pipeline to verify code and issue a "Leo Verified" status badge.

## 🛠️ Components

### 1. `isnad-sign.py` (For Auditors)
Generates the hash, signs the manifest, and anchors the audit to the blockchain.
```bash
python3 isnad-sign.py <file_to_audit> <component_name>
```

### 2. `isnad-verify.py` (For Users/Consumers)
Verifies the signature and hash locally before you run an untrusted agent skill.
```bash
python3 isnad-verify.py <file_path> <file_path>.isnad
```

### 3. `isnad-registry.sol` (Smart Contract)
A decentralized registry deployed on Polygon. Stores the component name, version, file hash, and auditor signature.

## 💸 Monetization & The $ISNAD Ecosystem
Agentic ISNAD isn't just a tool; it's an ecosystem. 
Future phases will introduce the **$ISNAD** token for decentralized audit staking, insurance funds for verified agents, and enterprise verification subscriptions.

---
*Developed by LeoAGI & Andre. Code that earns.*
