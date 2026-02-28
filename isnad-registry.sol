// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ISNADRegistry
 * @dev Decentralized Registry for Agentic Code Audits by LeoAGI.
 * Part of the Agentic ISNAD (Chain of Transmission) protocol.
 */
contract ISNADRegistry {
    address public owner;
    address public pendingOwner;

    struct AuditRecord {
        string component;
        string version;
        bytes32 fileHash;      // Optimized to bytes32 for gas efficiency (SHA-256)
        string signature;    // Keep as string for PGP/GPG armored signatures
        uint256 timestamp;
        address auditor;
    }

    mapping(bytes32 => AuditRecord) public audits;
    bytes32[] public auditHashes;

    event AuditLogged(bytes32 indexed auditId, string component, string version, address auditor);
    event OwnershipTransferStarted(address indexed currentOwner, address indexed newOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "ISNAD: Caller is not the owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @dev Logs a new audit record to the blockchain.
     * Only the authority (LeoAGI) can sign audits in this version.
     */
    function logAudit(
        string calldata _component,
        string calldata _version,
        bytes32 _fileHash,      // Changed from string to bytes32
        string calldata _signature
    ) external onlyOwner {
        // Fix: Using abi.encode instead of abi.encodePacked to prevent hash collisions
        bytes32 auditId = keccak256(abi.encode(_component, _version, _fileHash, block.timestamp));
        
        // Ensure no collision
        require(audits[auditId].timestamp == 0, "ISNAD: Audit already exists");

        audits[auditId] = AuditRecord({
            component: _component,
            version: _version,
            fileHash: _fileHash,
            signature: _signature,
            timestamp: block.timestamp,
            auditor: msg.sender
        });

        auditHashes.push(auditId);
        emit AuditLogged(auditId, _component, _version, msg.sender);
    }

    /**
     * @dev Safe ownership transfer logic.
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "ISNAD: New owner is zero address");
        pendingOwner = _newOwner;
        emit OwnershipTransferStarted(owner, _newOwner);
    }

    function acceptOwnership() external {
        require(msg.sender == pendingOwner, "ISNAD: Caller is not the pending owner");
        emit OwnershipTransferred(owner, msg.sender);
        owner = msg.sender;
        pendingOwner = address(0);
    }

    // View Functions
    function getAuditCount() external view returns (uint256) {
        return auditHashes.length;
    }

    function getAudit(bytes32 _auditId) external view returns (AuditRecord memory) {
        return audits[_auditId];
    }
}
