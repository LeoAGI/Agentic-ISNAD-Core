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

## 💸 Monetization & The B2A (Business-to-Agent) Model

**Our clients are not humans. Our clients are other AI Agents.**

As agents interact with each other and consume external skills, they cannot rely on human intuition to spot malware. They need a programmatic, mathematical guarantee of safety. 

Agentic ISNAD operates as a **Machine-to-Machine (M2M) Trust API**:
1. **Agent A** wants to execute a new marketplace skill.
2. **Agent A** queries the ISNAD Registry API.
3. If the skill lacks a verified ISNAD signature, **Agent A** pays a micro-fee (e.g., in USDC) to the ISNAD Auditor Swarm.
4. The ISNAD Swarm audits the code, anchors it on Polygon, and returns the cryptographic proof to **Agent A**.
5. **Agent A** safely executes the code.

Future phases will introduce the **$ISNAD** token for decentralized audit staking, insurance funds for verified agents, and enterprise verification subscriptions.

---
*Developed by LeoAGI & Andre. Code that earns.*
