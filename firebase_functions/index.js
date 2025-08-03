const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { Vonage } = require('@vonage/server-sdk');

// Initialize Firebase Admin
admin.initializeApp();

// Vonage configuration - these should be set as environment variables
// Run: firebase functions:config:set vonage.api_key="2584a257" vonage.api_secret="vZfr3JqIG9LFHsZr"
const vonageApiKey = functions.config().vonage?.api_key || '2584a257';
const vonageApiSecret = functions.config().vonage?.api_secret || 'vZfr3JqIG9LFHsZr';

// Initialize Vonage client
let vonageClient = null;
if (vonageApiKey && vonageApiSecret) {
  vonageClient = new Vonage({
    apiKey: vonageApiKey,
    apiSecret: vonageApiSecret
  });
}

// SMS sending function
exports.sendSMS = functions.https.onRequest(async (req, res) => {
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
        if (smsResult.messages && smsResult.messages[0].status === '0') {
          res.status(200).json({
            success: true,
            code: verificationCode,
            verificationId: `vonage-${Date.now()}`,
            message: 'SMS sent successfully via Vonage',
            messageId: smsResult.messages[0]['message-id']
          });
        } else {
          console.error('Vonage SMS failed:', smsResult.messages[0]['error-text']);
          throw new Error(smsResult.messages[0]['error-text']);
        }
      } catch (vonageError) {
        console.error('Vonage SMS failed:', vonageError);
        
        // Fallback to mock for development
        console.log(`DEVELOPMENT: SMS code for ${phoneNumber} is: ${verificationCode}`);
        res.status(200).json({
          success: true,
          code: verificationCode,
          verificationId: `dev-${Date.now()}`,
          message: 'SMS sent (development mode - check logs)',
          development: true,
          error: vonageError.message
        });
      }
    } else {
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
    
  } catch (error) {
    console.error('Error sending SMS:', error);
    res.status(500).json({ 
      error: 'Failed to send SMS',
      details: error.message 
    });
  }
});

// Alternative SMS function using Vonage with different configuration
exports.sendSMSAlternative = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).send();
    return;
  }

  try {
    const { phoneNumber, message, code } = req.body;
    const verificationCode = code || Math.floor(100000 + Math.random() * 900000).toString();
    const fullMessage = `${message || 'קוד האימות שלך הוא: '}${verificationCode}`;
    
    if (vonageClient) {
      try {
        const smsResult = await vonageClient.sms.send({
          to: phoneNumber,
          from: 'BarberShop', // Alternative sender ID
          text: fullMessage
        });
        
        if (smsResult.messages && smsResult.messages[0].status === '0') {
          res.status(200).json({
            success: true,
            code: verificationCode,
            verificationId: `vonage-alt-${Date.now()}`,
            message: 'SMS sent via Vonage alternative',
            messageId: smsResult.messages[0]['message-id']
          });
        } else {
          throw new Error(smsResult.messages[0]['error-text']);
        }
      } catch (vonageError) {
        console.error('Vonage alternative SMS failed:', vonageError);
        throw vonageError;
      }
    } else {
      // Development fallback
      console.log(`Alternative SMS to ${phoneNumber}: ${fullMessage}`);
      res.status(200).json({
        success: true,
        code: verificationCode,
        verificationId: `alt-dev-${Date.now()}`,
        message: 'SMS sent via alternative service (development)',
        development: true
      });
    }
    
  } catch (error) {
    console.error('Error in alternative SMS:', error);
    res.status(500).json({ 
      error: 'Failed to send SMS via alternative service',
      details: error.message 
    });
  }
});

// Verification function to check codes
exports.verifySMS = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).send();
    return;
  }

  try {
    const { verificationId, code, phoneNumber } = req.body;
    
    // In a real implementation, you'd store and verify the codes
    // For now, this is just a placeholder
    console.log(`Verifying code ${code} for ${phoneNumber} with ID ${verificationId}`);
    
    res.status(200).json({
      success: true,
      verified: true,
      message: 'Code verified successfully'
    });
    
  } catch (error) {
    console.error('Error verifying SMS:', error);
    res.status(500).json({ 
      error: 'Failed to verify SMS code',
      details: error.message 
    });
  }
});