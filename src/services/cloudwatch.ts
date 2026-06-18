import { CloudWatchLogsClient, FilterLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs';
import type { Config, ErrorEvent } from '../types/index.ts';
import consola from 'consola';

export class CloudWatchService {
  private client: CloudWatchLogsClient;
  private logGroupName: string;

  constructor(config: Config) {
    if (!config.aws.accessKeyId || !config.aws.secretAccessKey) {
      consola.warn('AWS credentials not configured. CloudWatch integration disabled.');
      this.client = null as any;
      this.logGroupName = '';
      return;
    }

    this.client = new CloudWatchLogsClient({
      region: config.aws.region,
      credentials: {
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretAccessKey,
      },
    });
    this.logGroupName = config.aws.logGroupName;
  }

  async fetchRecentErrors(minutes: number = 60): Promise<ErrorEvent[]> {
    if (!this.client) {
      return [];
    }

    try {
      const endTime = Date.now();
      const startTime = endTime - (minutes * 60 * 1000);

      const command = new FilterLogEventsCommand({
        logGroupName: this.logGroupName,
        startTime,
        endTime,
        filterPattern: '"ERROR" || "error" || "Error" || "exception"',
        limit: 100,
      });

      const response = await this.client.send(command);
      const events: ErrorEvent[] = [];

      if (response.events) {
        for (const event of response.events) {
          if (event.message) {
            events.push({
              source: 'cloudwatch',
              timestamp: new Date(event.timestamp || Date.now()),
              message: event.message,
              metadata: {
                logStreamName: event.logStreamName,
                eventId: event.eventId,
              },
            });
          }
        }
      }

      consola.info(`Fetched ${events.length} error events from CloudWatch`);
      return events;
    } catch (error) {
      consola.error('Error fetching CloudWatch logs:', error);
      return [];
    }
  }

  async searchLogs(errorMessage: string): Promise<string[]> {
    if (!this.client) {
      return [];
    }

    try {
      const command = new FilterLogEventsCommand({
        logGroupName: this.logGroupName,
        filterPattern: `"${errorMessage}"`,
        limit: 50,
      });

      const response = await this.client.send(command);
      const logs: string[] = [];

      if (response.events) {
        for (const event of response.events) {
          if (event.message) {
            logs.push(event.message);
          }
        }
      }

      return logs;
    } catch (error) {
      consola.error('Error searching CloudWatch logs:', error);
      return [];
    }
  }
}
