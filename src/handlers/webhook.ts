import type { ErrorEvent, SlackWebhookPayload, SentryWebhookPayload } from '../types/index.ts';
import { SentryService } from '../services/sentry.ts';
import consola from 'consola';

export class WebhookHandler {
  private sentryService: SentryService;

  constructor(sentryService: SentryService) {
    this.sentryService = sentryService;
  }

  handleSlackWebhook(payload: SlackWebhookPayload): ErrorEvent | null {
    try {
      // Parse Slack message to detect error patterns
      const text = payload.text || '';
      const attachments = payload.attachments || [];

      // Check if this is an error alert
      const isError = text.toLowerCase().includes('error') ||
                      text.toLowerCase().includes('exception') ||
                      text.toLowerCase().includes('failed');

      if (!isError) {
        return null;
      }

      // Extract error information
      let errorMessage = text;
      let severity: 'error' | 'warning' | 'critical' = 'error';

      if (text.toLowerCase().includes('critical')) {
        severity = 'critical';
      } else if (text.toLowerCase().includes('warning')) {
        severity = 'warning';
      }

      // Try to extract stack trace from attachments
      let stackTrace: string | undefined;
      const metadata: Record<string, unknown> = {};

      for (const attachment of attachments) {
        if (attachment.text) {
          errorMessage += '\n' + attachment.text;
        }
        if (attachment.fields) {
          for (const field of attachment.fields) {
            metadata[field.title] = field.value;
          }
        }
      }

      return {
        source: 'slack',
        timestamp: new Date(),
        message: errorMessage,
        stackTrace,
        severity,
        metadata,
      };
    } catch (error) {
      consola.error('Error parsing Slack webhook:', error);
      return null;
    }
  }

  handleSentryWebhook(payload: SentryWebhookPayload): ErrorEvent | null {
    return this.sentryService.parseWebhookEvent(payload);
  }

  validateWebhookSignature(signature: string, payload: string, secret: string): boolean {
    // Implement webhook signature validation
    // This is a placeholder - implement proper HMAC validation based on your webhook provider
    return true;
  }
}
