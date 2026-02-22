import type { Config } from './types/index.ts';
import consola from 'consola';

export function loadConfig(): Config {
  const requiredEnvVars = [
    'GITHUB_TOKEN',
    'GITHUB_OWNER',
    'GITHUB_REPO',
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    consola.error(`Missing required environment variables: ${missingVars.join(', ')}`);
    throw new Error('Missing required configuration');
  }

  return {
    github: {
      token: process.env.GITHUB_TOKEN!,
      owner: process.env.GITHUB_OWNER!,
      repo: process.env.GITHUB_REPO!,
    },
    aws: {
      region: process.env.AWS_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      logGroupName: process.env.AWS_LOG_GROUP_NAME || '',
    },
    sentry: {
      dsn: process.env.SENTRY_DSN || '',
      authToken: process.env.SENTRY_AUTH_TOKEN,
      organization: process.env.SENTRY_ORGANIZATION,
      project: process.env.SENTRY_PROJECT,
    },
    slack: {
      webhookUrl: process.env.SLACK_WEBHOOK_URL,
      botToken: process.env.SLACK_BOT_TOKEN,
    },
    server: {
      port: parseInt(process.env.PORT || '3000', 10),
      webhookSecret: process.env.WEBHOOK_SECRET || 'default-secret',
    },
  };
}
