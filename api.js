const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const crypto = require('crypto');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

// In-memory database for hackathon/beta phase
const auditRequests = {};

// Payment Configuration
const USDC_PRICE = 10; // 10 USDC per audit
const RECEIVER_WALLET = "0x1aF990C1Fc86F5E761043D1C74c1cC4e1187946D"; // ISNAD Treasury Wallet

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
            network: "Polygon POS"
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
 * Endpoint for Agents to check audit status and retrieve signatures.
 * In a real scenario, a webhook/cron would listen for the USDC transfer and trigger the audit.
 * For this MVP, we will simulate the audit process if an agent requests 'process_demo=true'
 */
app.get('/api/v1/audit/status/:audit_id', (req, res) => {
    const audit_id = req.params.audit_id;
    const request = auditRequests[audit_id];

    if (!request) {
        return res.status(404).json({ error: "Audit not found." });
    }

    // DEMO MODE: Auto-process the audit if requested (simulating successful payment)
    if (req.query.process_demo === 'true' && request.status === 'pending_payment') {
        request.status = 'processing';
        
        // Save code to a temporary file
        const tempFilePath = path.join(__dirname, `temp_${audit_id}.py`);
        fs.writeFileSync(tempFilePath, request.code);

        // Run the Python isnad-sign.py script
        // Note: in a real environment we would use a queue, sandboxed LLM auditing, etc.
        const cmd = `python3 ${path.join(__dirname, 'isnad-sign.py')} ${tempFilePath} ${request.component_name} --no-anchor`;
        
        exec(cmd, { cwd: __dirname }, (error, stdout, stderr) => {
            if (error) {
                console.error(`Exec error: ${error}`);
                request.status = "failed";
                request.error = stderr;
            } else {
                // Read the generated .isnad file
                const isnadFile = `${tempFilePath}.isnad`;
                if (fs.existsSync(isnadFile)) {
                    const isnadData = JSON.parse(fs.readFileSync(isnadFile, 'utf8'));
                    request.status = "completed";
                    request.result = isnadData;
                    
                    // Cleanup
                    fs.unlinkSync(tempFilePath);
                    fs.unlinkSync(isnadFile);
                } else {
                    request.status = "failed";
                    request.error = "Signature generation failed.";
                }
            }
        });

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
    console.log(`Endpoint: GET /api/v1/audit/status/:audit_id`);
});
