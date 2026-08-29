import type { Config, ErrorEvent, SentryWebhookPayload } from '../types/index.ts';
import consola from 'consola';

export class SentryService {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  parseWebhookEvent(payload: SentryWebhookPayload): ErrorEvent | null {
    try {
      const { data } = payload;
      const { issue, event } = data;

      if (!issue) {
        return null;
      }

      let stackTrace: string | undefined;
      let affectedFile: string | undefined;

      if (event?.stacktrace?.frames) {
        const frames = event.stacktrace.frames;
        const relevantFrames = frames.filter(f => f.filename && !f.filename.includes('node_modules'));
        
        if (relevantFrames.length > 0) {
          const topFrame = relevantFrames[relevantFrames.length - 1];
          affectedFile = topFrame?.filename;
          stackTrace = relevantFrames
            .map(f => `  at ${f.function || 'anonymous'} (${f.filename}:${f.lineno})`)
            .join('\n');
        }
      }

      return {
        source: 'sentry',
        timestamp: event?.timestamp ? new Date(event.timestamp) : new Date(),
        message: issue.title,
        stackTrace,
        severity: issue.level === 'error' ? 'error' : 'warning',
        metadata: {
          issueId: issue.id,
          culprit: issue.culprit,
          eventId: event?.id,
          affectedFile,
          type: issue.metadata?.type,
        },
      };
    } catch (error) {
      consola.error('Error parsing Sentry webhook:', error);
      return null;
    }
  }

  async fetchIssueDetails(issueId: string): Promise<any> {
    if (!this.config.sentry.authToken || !this.config.sentry.organization || !this.config.sentry.project) {
      consola.warn('Sentry API not configured');
      return null;
    }

    try {
      const url = `https://sentry.io/api/0/projects/${this.config.sentry.organization}/${this.config.sentry.project}/issues/${issueId}/`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.config.sentry.authToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Sentry API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      consola.error('Error fetching Sentry issue details:', error);
      return null;
    }
  }
}
