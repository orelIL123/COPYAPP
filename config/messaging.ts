import { MessagingConfig } from '../services/messaging/types';

export const messagingConfig: MessagingConfig = {
  providers: {
    vonage: {
      apiKey: process.env.VONAGE_API_KEY || '2584a257',
      apiSecret: process.env.VONAGE_API_SECRET || 'vZfr3JqIG9LFHsZr',
      enabled: true
    },
    whatsapp: {
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
      accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
      enabled: !!process.env.WHATSAPP_ACCESS_TOKEN
    }
  },
  defaultProvider: (process.env.DEFAULT_MESSAGING_PROVIDER as 'vonage' | 'whatsapp') || 'vonage',
  fallbackEnabled: process.env.MESSAGING_FALLBACK_ENABLED !== 'false'
};

export const updateMessagingProvider = (provider: 'vonage' | 'whatsapp') => {
  messagingConfig.defaultProvider = provider;
};

export const enableWhatsApp = (phoneNumberId: string, accessToken: string) => {
  messagingConfig.providers.whatsapp = {
    phoneNumberId,
    accessToken,
    enabled: true
  };
  
  // Optionally switch to WhatsApp as default
  if (messagingConfig.defaultProvider === 'vonage') {
    messagingConfig.defaultProvider = 'whatsapp';
  }
};