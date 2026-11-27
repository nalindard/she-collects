import type { ErrorEvent, ErrorAnalysis } from '../types/index.ts';
import { GitHubService } from './github.ts';
import { CloudWatchService } from './cloudwatch.ts';
import consola from 'consola';

export class ErrorAnalyzer {
  private githubService: GitHubService;
  private cloudwatchService: CloudWatchService;

  constructor(githubService: GitHubService, cloudwatchService: CloudWatchService) {
    this.githubService = githubService;
    this.cloudwatchService = cloudwatchService;
  }

  async analyzeError(error: ErrorEvent): Promise<ErrorAnalysis | null> {
    consola.info(`Analyzing error from ${error.source}: ${error.message.substring(0, 100)}...`);

    // Step 1: Search GitHub code for the error
    const codeAnalysis = await this.githubService.searchCodeForError(
      error.message,
      error.stackTrace
    );

    if (!codeAnalysis) {
      consola.warn('Could not find matching code in GitHub');
      return null;
    }

    // Step 2: Fetch related CloudWatch logs if available
    if (error.source !== 'cloudwatch') {
      const relatedLogs = await this.cloudwatchService.searchLogs(
        error.message.split('\n')[0]?.substring(0, 50) || ''
      );
      
      if (relatedLogs.length > 0) {
        consola.info(`Found ${relatedLogs.length} related CloudWatch logs`);
        codeAnalysis.confidence = Math.min(codeAnalysis.confidence + 0.1, 1.0);
      }
    }

    return codeAnalysis;
  }

  async processError(error: ErrorEvent): Promise<void> {
    try {
      // Analyze the error
      const analysis = await this.analyzeError(error);

      if (!analysis) {
        consola.warn('Could not analyze error, creating basic issue');
        await this.createBasicIssue(error);
        return;
      }

      // Check if we should create a PR or an issue
      const shouldCreatePR = this.shouldCreatePR(analysis);

      if (shouldCreatePR) {
        await this.createAutomatedPR(error, analysis);
      } else {
        await this.createDetailedIssue(error, analysis);
      }
    } catch (error_) {
      consola.error('Error processing error event:', error_);
    }
  }

  private shouldCreatePR(analysis: ErrorAnalysis): boolean {
    // Only create PRs for high-confidence fixes with clear suggestions
    return analysis.confidence > 0.8 && 
           !!analysis.suggestedFix && 
           !!analysis.affectedFile;
  }

  private async createBasicIssue(error: ErrorEvent): Promise<void> {
    const title = `[Automated] Error detected: ${error.message.split('\n')[0]?.substring(0, 80)}`;
    
    const exists = await this.githubService.checkIfIssueExists(title);
    if (exists) {
      consola.info('Issue already exists, skipping');
      return;
    }

    const body = this.generateIssueBody(error, null);
    await this.githubService.createIssue(title, body);
  }

  private async createDetailedIssue(error: ErrorEvent, analysis: ErrorAnalysis): Promise<void> {
    const title = `[Automated] ${analysis.errorType}: ${error.message.split('\n')[0]?.substring(0, 80)}`;
    
    const exists = await this.githubService.checkIfIssueExists(title);
    if (exists) {
      consola.info('Issue already exists, skipping');
      return;
    }

    const body = this.generateIssueBody(error, analysis);
    await this.githubService.createIssue(title, body);
  }

  private async createAutomatedPR(error: ErrorEvent, analysis: ErrorAnalysis): Promise<void> {
    const title = `[Automated Fix] ${error.message.split('\n')[0]?.substring(0, 80)}`;
    const branch = `auto-fix-${Date.now()}`;
    
    const body = `## Automated Error Fix

This PR was automatically generated in response to an error detected in production.

### Error Details
- **Source**: ${error.source}
- **Severity**: ${error.severity || 'unknown'}
- **Timestamp**: ${error.timestamp.toISOString()}

### Error Message
\`\`\`
${error.message}
\`\`\`

${error.stackTrace ? `### Stack Trace
\`\`\`
${error.stackTrace}
\`\`\`
` : ''}

### Analysis
- **Error Type**: ${analysis.errorType}
- **Affected File**: ${analysis.affectedFile || 'unknown'}
- **Affected Line**: ${analysis.affectedLine || 'unknown'}
- **Confidence**: ${(analysis.confidence * 100).toFixed(0)}%

### Suggested Fix
${analysis.suggestedFix || 'No specific fix suggested'}

⚠️ **Please review this automated fix carefully before merging.**
`;

    // For now, we don't automatically modify code, just create an issue-like PR description
    // In a real implementation, you'd generate the actual code changes here
    consola.warn('Automatic code modification not implemented. Creating issue instead.');
    await this.createDetailedIssue(error, analysis);
  }

  private generateIssueBody(error: ErrorEvent, analysis: ErrorAnalysis | null): string {
    let body = `## Automated Error Report

This issue was automatically created in response to an error detected in production.

### Error Details
- **Source**: ${error.source}
- **Severity**: ${error.severity || 'unknown'}
- **Timestamp**: ${error.timestamp.toISOString()}
- **Environment**: ${error.environment || 'unknown'}

### Error Message
\`\`\`
${error.message}
\`\`\`
`;

    if (error.stackTrace) {
      body += `
### Stack Trace
\`\`\`
${error.stackTrace}
\`\`\`
`;
    }

    if (analysis) {
      body += `
### Analysis
- **Error Type**: ${analysis.errorType}
- **Affected File**: ${analysis.affectedFile || 'unknown'}
- **Affected Line**: ${analysis.affectedLine || 'unknown'}
- **Confidence**: ${(analysis.confidence * 100).toFixed(0)}%

### Suggested Action
${analysis.suggestedFix || 'Manual investigation required'}
`;
    }

    if (error.metadata) {
      body += `
### Additional Metadata
\`\`\`json
${JSON.stringify(error.metadata, null, 2)}
\`\`\`
`;
    }

    body += `
---
*This issue was automatically generated by the error monitoring system.*
`;

    return body;
  }
}
