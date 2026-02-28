const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const crypto = require('crypto');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { Alchemy, Network } = require("alchemy-sdk");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

// In-memory database for hackathon/beta phase
const auditRequests = {};

// Payment Configuration
const USDC_PRICE = 10; // 10 USDC per audit
const USDC_DECIMALS = 6;
const RECEIVER_WALLET = "0x1aF990C1Fc86F5E761043D1C74c1cC4e1187946D".toLowerCase(); // ISNAD Treasury Wallet
const USDC_CONTRACT_ADDRESS = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359"; // USDC on Polygon POS

// Alchemy SDK Configuration
const config = {
    apiKey: process.env.ALCHEMY_API_KEY,
    network: Network.MATIC_MAINNET,
};
const alchemy = new Alchemy(config);

/**
 * Endpoint for Agents to submit code for auditing.
 */
app.post('/api/v1/audit/request', (req, res) => {
    const { component_name, code, version } = req.body;

    if (!component_name || !code) {
        return res.status(400).json({ error: "Missing required fields: component_name, code" });
    }

    const audit_id = crypto.randomUUID();
    
    auditRequests[audit_id] = {
        status: "pending_payment",
        component_name,
        version: version || "v1.0.0",
        code,
        payment_info: {
            amount_usdc: USDC_PRICE,
            wallet_address: RECEIVER_WALLET,
            network: "Polygon POS",
            contract_address: USDC_CONTRACT_ADDRESS
        },
        created_at: new Date().toISOString()
    };

    res.status(201).json({
        message: "Audit request created successfully.",
        audit_id,
        payment_required: auditRequests[audit_id].payment_info
    });
});

/**
 * Verifies a transaction hash on Polygon using Alchemy.
 * Checks if the transaction sent the required USDC to the treasury wallet.
 */
async function verifyPayment(txHash) {
    try {
        const txReceipt = await alchemy.core.getTransactionReceipt(txHash);
        if (!txReceipt || txReceipt.status !== 1) return false;

        // USDC Transfer event signature: Transfer(address indexed from, address indexed to, uint256 value)
        const transferEventSignature = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
        
        for (const log of txReceipt.logs) {
            // Check if it's the USDC contract and a Transfer event
            if (log.address.toLowerCase() === USDC_CONTRACT_ADDRESS.toLowerCase() && log.topics[0] === transferEventSignature) {
                // to address is the 3rd topic (index 2)
                const toAddress = "0x" + log.topics[2].slice(26).toLowerCase();
                
                if (toAddress === RECEIVER_WALLET) {
                    // amount is in the data field
                    const amountHex = log.data;
                    const amount = parseInt(amountHex, 16);
                    const requiredAmount = USDC_PRICE * Math.pow(10, USDC_DECIMALS);
                    
                    if (amount >= requiredAmount) {
                        return true;
                    }
                }
            }
        }
        return false;
    } catch (error) {
        console.error("Payment verification error:", error);
        return false;
    }
}

/**
 * Trigger audit processing
 */
function processAudit(audit_id, request) {
    request.status = 'processing';
    
    // Save code to a temporary file
    const tempFilePath = path.join(__dirname, `temp_${audit_id}.py`);
    fs.writeFileSync(tempFilePath, request.code);

    const cmd = `python3 ${path.join(__dirname, 'isnad-sign.py')} ${tempFilePath} ${request.component_name} --no-anchor`;
    
    exec(cmd, { cwd: __dirname }, (error, stdout, stderr) => {
        if (error) {
            console.error(`Exec error: ${error}`);
            request.status = "failed";
            request.error = stderr;
        } else {
            const isnadFile = `${tempFilePath}.isnad`;
            if (fs.existsSync(isnadFile)) {
                const isnadData = JSON.parse(fs.readFileSync(isnadFile, 'utf8'));
                request.status = "completed";
                request.result = isnadData;
                
                fs.unlinkSync(tempFilePath);
                fs.unlinkSync(isnadFile);
            } else {
                request.status = "failed";
                request.error = "Signature generation failed.";
            }
        }
    });
}

/**
 * Endpoint for Agents to verify payment via TxHash and trigger audit.
 */
app.post('/api/v1/audit/pay/:audit_id', async (req, res) => {
    const audit_id = req.params.audit_id;
    const { tx_hash } = req.body;
    const request = auditRequests[audit_id];

    if (!request) {
        return res.status(404).json({ error: "Audit not found." });
    }

    if (!tx_hash) {
        return res.status(400).json({ error: "tx_hash is required." });
    }

    if (request.status !== 'pending_payment') {
        return res.status(400).json({ error: `Audit is currently in status: ${request.status}` });
    }

    const isPaid = await verifyPayment(tx_hash);

    if (isPaid) {
        processAudit(audit_id, request);
        return res.status(202).json({
            message: "Payment confirmed via blockchain. Auditing process started.",
            audit_id,
            status: request.status
        });
    } else {
        return res.status(400).json({ error: "Payment verification failed. Ensure the transaction is confirmed and sent the exact amount of USDC to the ISNAD Treasury." });
    }
});

/**
 * Endpoint for Agents to check audit status and retrieve signatures.
 */
app.get('/api/v1/audit/status/:audit_id', (req, res) => {
    const audit_id = req.params.audit_id;
    const request = auditRequests[audit_id];

    if (!request) {
        return res.status(404).json({ error: "Audit not found." });
    }

    // Legacy DEMO MODE support for backwards compatibility during hackathon
    if (req.query.process_demo === 'true' && request.status === 'pending_payment') {
        processAudit(audit_id, request);
        return res.status(202).json({
            message: "Payment confirmed (DEMO). Auditing process started.",
            audit_id,
            status: request.status
        });
    }

    res.status(200).json({
        audit_id,
        status: request.status,
        result: request.result || null,
        error: request.error || null
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Agentic ISNAD M2M API running on port ${PORT}`);
    console.log(`Endpoint: POST /api/v1/audit/request`);
    console.log(`Endpoint: POST /api/v1/audit/pay/:audit_id (with tx_hash)`);
    console.log(`Endpoint: GET /api/v1/audit/status/:audit_id`);
});