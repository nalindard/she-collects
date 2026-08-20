export interface ErrorEvent {
  source: 'slack' | 'sentry' | 'cloudwatch';
  timestamp: Date;
  message: string;
  stackTrace?: string;
  environment?: string;
  severity?: 'error' | 'warning' | 'critical';
  metadata?: Record<string, unknown>;
}

export interface ErrorAnalysis {
  errorType: string;
  affectedFile?: string;
  affectedLine?: number;
  suggestedFix?: string;
  confidence: number;
}

export interface GitHubPRRequest {
  title: string;
  body: string;
  branch: string;
  files: Array<{
    path: string;
    content: string;
  }>;
}

export interface Config {
  github: {
    token: string;
    owner: string;
    repo: string;
  };
  aws: {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    logGroupName: string;
  };
  sentry: {
    dsn: string;
    authToken?: string;
    organization?: string;
    project?: string;
  };
  slack: {
    webhookUrl?: string;
    botToken?: string;
  };
  server: {
    port: number;
    webhookSecret: string;
  };
}

export interface SlackWebhookPayload {
  text?: string;
  attachments?: Array<{
    fallback?: string;
    color?: string;
    title?: string;
    text?: string;
    fields?: Array<{
      title: string;
      value: string;
      short?: boolean;
    }>;
  }>;
}

export interface SentryWebhookPayload {
  action: string;
  data: {
    issue: {
      id: string;
      title: string;
      culprit?: string;
      level?: string;
      metadata?: {
        value?: string;
        type?: string;
      };
    };
    event?: {
      id: string;
      timestamp: string;
      stacktrace?: {
        frames: Array<{
          filename: string;
          function: string;
          lineno: number;
          context_line?: string;
        }>;
      };
    };
  };
}
