"use strict";
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
const firebase_functions_1 = require("firebase-functions");
const admin = require("firebase-admin");
const server_sdk_1 = require("@vonage/server-sdk");
const auth_1 = require("@vonage/auth");
// Initialize Firebase Admin
admin.initializeApp();
// Vonage configuration - these should be set as environment variables
// Run: firebase functions:config:set vonage.api_key="2584a257" vonage.api_secret="vZfr3JqIG9LFHsZr"
const vonageApiKey = ((_a = (0, firebase_functions_1.config)().vonage) === null || _a === void 0 ? void 0 : _a.api_key) || '2584a257';
const vonageApiSecret = ((_b = (0, firebase_functions_1.config)().vonage) === null || _b === void 0 ? void 0 : _b.api_secret) || 'vZfr3JqIG9LFHsZr';
// Initialize Vonage client
let vonageClient = null;
if (vonageApiKey && vonageApiSecret) {
    const credentials = new auth_1.Auth({
        apiKey: vonageApiKey,
        apiSecret: vonageApiSecret
    });
    vonageClient = new server_sdk_1.Vonage(credentials);
}
// SMS sending function
exports.sendSMS = firebase_functions_1.https.onRequest(async (req, res) => {
    // Enable CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        res.status(200).send();
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).send('Method not allowed');
        return;
    }
    try {
        const { phoneNumber, message } = req.body;
        if (!phoneNumber) {
            res.status(400).json({ error: 'Phone number is required' });
            return;
        }
        // Get the verification code from the request (sent by Firebase Auth or generate for fallback)
        const verificationCode = req.body.code || Math.floor(100000 + Math.random() * 900000).toString();
        const fullMessage = `${message || 'קוד האימות שלך הוא: '}${verificationCode}`;
        console.log(`Sending SMS to ${phoneNumber}: ${fullMessage}`);
        if (vonageClient) {
            // Send real SMS via Vonage
            try {
                const smsResult = await vonageClient.sms.send({
                    to: phoneNumber,
                    from: 'BarbersBar', // Sender ID - can be customized
                    text: fullMessage
                });
                console.log(`SMS sent successfully via Vonage:`, smsResult);
                // Check if message was sent successfully
                if (smsResult.messages[0].status === '0') {
                    res.status(200).json({
                        success: true,
                        code: verificationCode,
                        verificationId: `vonage-${Date.now()}`,
                        message: 'SMS sent successfully via Vonage',
                        messageId: smsResult.messages[0]['message-id']
                    });
                }
                else {
                    console.error('Vonage SMS failed:', smsResult.messages[0].errorText);
                    throw new Error(smsResult.messages[0].errorText);
                }
            }
            catch (vonageError) {
                console.error('Vonage SMS failed:', vonageError);
                res.status(500).json({
                    success: false,
                    error: 'Vonage API request failed.',
                    details: vonageError.message,
                    isVonageError: true
                });
            }
        }
        else {
            // Development mode - just return the code
            console.log(`DEVELOPMENT: SMS code for ${phoneNumber} is: ${verificationCode}`);
            res.status(200).json({
                success: true,
                code: verificationCode,
                verificationId: `dev-${Date.now()}`,
                message: 'SMS sent (development mode - check logs)',
                development: true
            });
        }
    }
    catch (error) {
        console.error('Error sending SMS:', error);
        res.status(500).json({
            error: 'Failed to send SMS',
            details: error.message
        });
    }
});
//# sourceMappingURL=index.js.map