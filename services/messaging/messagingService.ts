import { MessageProvider, SendMessageParams, SendMessageResult, MessagingConfig } from './types';
import { VonageProvider } from './providers/vonageProvider';
import { WhatsAppProvider } from './providers/whatsappProvider';

export class MessagingService {
  private providers: Map<string, MessageProvider> = new Map();
  private config: MessagingConfig;

  constructor(config: MessagingConfig) {
    this.config = config;
    this.initializeProviders();
  }

  private initializeProviders() {
    // Initialize Vonage provider if configured
    if (this.config.providers.vonage) {
      const vonageProvider = new VonageProvider(this.config.providers.vonage);
      this.providers.set('vonage', vonageProvider);
    }

    // Initialize WhatsApp provider if configured
    if (this.config.providers.whatsapp) {
      const whatsappProvider = new WhatsAppProvider(this.config.providers.whatsapp);
      this.providers.set('whatsapp', whatsappProvider);
    }
  }

  async sendMessage(params: SendMessageParams): Promise<SendMessageResult> {
    const primaryProvider = this.providers.get(this.config.defaultProvider);
    
    // Try primary provider first
    if (primaryProvider?.isAvailable()) {
      const result = await primaryProvider.send(params);
      if (result.success || !this.config.fallbackEnabled) {
        return result;
      }
    }

    // If fallback is enabled and primary failed, try other providers
    if (this.config.fallbackEnabled) {
      for (const [providerName, provider] of this.providers) {
        if (providerName !== this.config.defaultProvider && provider.isAvailable()) {
          const result = await provider.send(params);
          if (result.success) {
            return result;
          }
        }
      }
    }

    return {
      success: false,
      error: 'No available messaging providers',
      provider: 'none'
    };
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.entries())
      .filter(([_, provider]) => provider.isAvailable())
      .map(([name]) => name);
  }

  updateConfig(newConfig: Partial<MessagingConfig>) {
    this.config = { ...this.config, ...newConfig };
    this.providers.clear();
    this.initializeProviders();
  }
}