# WhatsApp API Integration Guide

This document outlines how to integrate WhatsApp API into the Barbers Bar application without requiring a rebuild.

## Current Setup

The messaging system has been abstracted to support multiple providers:
- **Current Provider**: Vonage SMS
- **Future Provider**: WhatsApp API
- **Architecture**: Provider-based messaging service with fallback support

## Integration Steps

### 1. Environment Variables

Add these environment variables to your `.env` file:

```env
# WhatsApp Business API
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_ACCESS_TOKEN=your_permanent_access_token

# Optional: Change default provider
DEFAULT_MESSAGING_PROVIDER=whatsapp

# Optional: Disable fallback
MESSAGING_FALLBACK_ENABLED=false
```

### 2. Enable WhatsApp Provider

The WhatsApp provider will automatically activate when the environment variables are set. You can also programmatically enable it:

```typescript
import { enableWhatsApp, updateMessagingProvider } from '../config/messaging';

// Enable WhatsApp with credentials
enableWhatsApp('your_phone_number_id', 'your_access_token');

// Switch to WhatsApp as default provider
updateMessagingProvider('whatsapp');
```

### 3. No Code Changes Required

The existing SMS functionality will automatically use WhatsApp when configured:
- `sendSMSVerification()` in `services/firebase.ts` already uses the messaging service
- Message routing is handled automatically based on configuration
- Fallback to SMS will work if WhatsApp fails (when enabled)

## File Structure

```
services/
├── messaging/
│   ├── index.ts              # Main export and service instance
│   ├── types.ts              # TypeScript interfaces
│   ├── messagingService.ts   # Core service logic
│   └── providers/
│       ├── vonageProvider.ts # SMS via Vonage
│       └── whatsappProvider.ts # WhatsApp messages
config/
└── messaging.ts              # Configuration and helper functions
```

## WhatsApp Business API Requirements

### Prerequisites
1. **Meta Business Account**: Set up at business.facebook.com
2. **WhatsApp Business App**: Create in Meta for Developers
3. **Phone Number**: Verify a business phone number
4. **Webhook**: Set up webhook endpoint for message delivery status (optional)

### API Endpoints Used
- **Send Message**: `https://graph.facebook.com/v17.0/{phone-number-id}/messages`
- **Authentication**: Bearer token via `WHATSAPP_ACCESS_TOKEN`

### Message Format
The WhatsApp provider sends text messages in this format:
```json
{
  "messaging_product": "whatsapp",
  "to": "+972501234567",
  "type": "text",
  "text": {
    "body": "קוד האימות שלך הוא: 123456"
  }
}
```

## Testing

### 1. Test WhatsApp Integration
```typescript
import { messagingService } from './services/messaging';

// Test WhatsApp message
const result = await messagingService.sendMessage({
  to: '+972501234567',
  message: 'קוד האימות שלך הוא: 123456',
  type: 'sms' // Type doesn't affect WhatsApp provider
});

console.log('Message sent via:', result.provider);
```

### 2. Verify Provider Status
```typescript
import { messagingService } from './services/messaging';

// Check which providers are available
console.log('Available providers:', messagingService.getAvailableProviders());
```

## Configuration Options

### Provider Priority
- Set `DEFAULT_MESSAGING_PROVIDER=whatsapp` to use WhatsApp first
- Set `DEFAULT_MESSAGING_PROVIDER=vonage` to use SMS first

### Fallback Behavior
- `MESSAGING_FALLBACK_ENABLED=true`: Try other providers if primary fails
- `MESSAGING_FALLBACK_ENABLED=false`: Only use the default provider

### Runtime Configuration Updates
```typescript
import { messagingService } from './services/messaging';

// Update configuration without restart
messagingService.updateConfig({
  defaultProvider: 'whatsapp',
  fallbackEnabled: false
});
```

## Migration Checklist

- [ ] Set up WhatsApp Business API account
- [ ] Obtain phone number ID and permanent access token
- [ ] Add environment variables to `.env`
- [ ] Test WhatsApp messaging in development
- [ ] Monitor message delivery rates
- [ ] Update user notifications about WhatsApp support (optional)

## Benefits of This Architecture

1. **Zero Downtime**: Switch providers without rebuilding
2. **Reliability**: Automatic fallback if one provider fails
3. **Cost Optimization**: Use cheaper provider when possible
4. **Future-Proof**: Easy to add more messaging providers (Telegram, etc.)
5. **A/B Testing**: Test different providers with different user groups

## Troubleshooting

### WhatsApp Not Working
1. Check environment variables are set correctly
2. Verify phone number ID is valid
3. Ensure access token has proper permissions
4. Check WhatsApp Business account status

### Fallback Behavior
- Messages will automatically fall back to Vonage SMS if WhatsApp fails
- Check logs for provider selection: `SMS sent successfully via whatsapp`
- Disable fallback if you want WhatsApp-only messaging

### Rate Limits
- WhatsApp: 1000 messages per day (free tier)
- Vonage: Based on your plan
- The service will automatically handle provider switching based on limits