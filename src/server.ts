import consola from 'consola';
import { loadConfig } from './config.ts';
import { CloudWatchService } from './services/cloudwatch.ts';
import { SentryService } from './services/sentry.ts';
import { GitHubService } from './services/github.ts';
import { ErrorAnalyzer } from './services/analyzer.ts';
import { WebhookHandler } from './handlers/webhook.ts';
import type { SlackWebhookPayload, SentryWebhookPayload } from './types/index.ts';

async function startServer() {
  const config = loadConfig();

  // Initialize services
  const cloudwatchService = new CloudWatchService(config);
  const sentryService = new SentryService(config);
  const githubService = new GitHubService(config);
  const errorAnalyzer = new ErrorAnalyzer(githubService, cloudwatchService);
  const webhookHandler = new WebhookHandler(sentryService);

  consola.info('Starting error monitoring server...');

  const server = Bun.serve({
    port: config.server.port,
    async fetch(req) {
      const url = new URL(req.url);

      // Health check endpoint
      if (url.pathname === '/health') {
        return new Response('OK', { status: 200 });
      }

      // Slack webhook endpoint
      if (url.pathname === '/webhook/slack' && req.method === 'POST') {
        try {
          const payload = await req.json() as SlackWebhookPayload;
          const errorEvent = webhookHandler.handleSlackWebhook(payload);

          if (errorEvent) {
            // Process error in background
            errorAnalyzer.processError(errorEvent).catch(err => {
              consola.error('Error processing Slack webhook:', err);
            });
            return new Response(JSON.stringify({ success: true }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            });
          }

          return new Response(JSON.stringify({ success: true, message: 'Not an error event' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        } catch (error) {
          consola.error('Error handling Slack webhook:', error);
          return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }

      // Sentry webhook endpoint
      if (url.pathname === '/webhook/sentry' && req.method === 'POST') {
        try {
          const payload = await req.json() as SentryWebhookPayload;
          const errorEvent = webhookHandler.handleSentryWebhook(payload);

          if (errorEvent) {
            // Process error in background
            errorAnalyzer.processError(errorEvent).catch(err => {
              consola.error('Error processing Sentry webhook:', err);
            });
            return new Response(JSON.stringify({ success: true }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            });
          }

          return new Response(JSON.stringify({ success: true, message: 'Not an error event' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        } catch (error) {
          consola.error('Error handling Sentry webhook:', error);
          return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }

      // Manual trigger endpoint (for testing)
      if (url.pathname === '/trigger-scan' && req.method === 'POST') {
        try {
          consola.info('Manual CloudWatch scan triggered');
          const errors = await cloudwatchService.fetchRecentErrors(60);
          
          for (const error of errors) {
            await errorAnalyzer.processError(error);
          }

          return new Response(JSON.stringify({ 
            success: true, 
            errorsProcessed: errors.length 
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        } catch (error) {
          consola.error('Error during manual scan:', error);
          return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }

      return new Response('Not Found', { status: 404 });
    },
  });

  consola.success(`Server running on port ${server.port}`);
  consola.info('Available endpoints:');
  consola.info(`  - POST http://localhost:${server.port}/webhook/slack`);
  consola.info(`  - POST http://localhost:${server.port}/webhook/sentry`);
  consola.info(`  - POST http://localhost:${server.port}/trigger-scan`);
  consola.info(`  - GET  http://localhost:${server.port}/health`);
}

startServer().catch(error => {
  consola.error('Failed to start server:', error);
  process.exit(1);
});
