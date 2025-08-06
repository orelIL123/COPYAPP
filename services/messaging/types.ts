export interface MessageProvider {
  name: string;
  send(params: SendMessageParams): Promise<SendMessageResult>;
  isAvailable(): boolean;
}

export interface SendMessageParams {
  to: string;
  message: string;
  type?: 'sms' | 'whatsapp';
  metadata?: Record<string, any>;
}

export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: string;
}

export interface MessagingConfig {
  providers: {
    vonage?: {
      apiKey: string;
      apiSecret: string;
      enabled: boolean;
    };
    whatsapp?: {
      phoneNumberId: string;
      accessToken: string;
      enabled: boolean;
    };
  };
  defaultProvider: 'vonage' | 'whatsapp';
  fallbackEnabled: boolean;
}