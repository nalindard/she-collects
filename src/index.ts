import consola from 'consola';
import { loadConfig } from './config.ts';
import { CloudWatchService } from './services/cloudwatch.ts';
import { SentryService } from './services/sentry.ts';
import { GitHubService } from './services/github.ts';
import { ErrorAnalyzer } from './services/analyzer.ts';

async function main() {
  consola.info('Error Monitoring System');
  consola.info('======================');

  try {
    const config = loadConfig();

    // Initialize services
    const cloudwatchService = new CloudWatchService(config);
    const sentryService = new SentryService(config);
    const githubService = new GitHubService(config);
    const errorAnalyzer = new ErrorAnalyzer(githubService, cloudwatchService);

    // Fetch recent errors from CloudWatch
    consola.info('Fetching recent errors from CloudWatch...');
    const errors = await cloudwatchService.fetchRecentErrors(60);

    if (errors.length === 0) {
      consola.success('No errors found in the last 60 minutes');
      return;
    }

    consola.info(`Found ${errors.length} error(s). Processing...`);

    // Process each error
    for (const error of errors) {
      await errorAnalyzer.processError(error);
    }

    consola.success('Error processing completed');
  } catch (error) {
    consola.error('Error running monitoring system:', error);
    process.exit(1);
  }
}

main();
