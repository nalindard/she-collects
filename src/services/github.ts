import { Octokit } from '@octokit/rest';
import type { Config, ErrorAnalysis, ErrorEvent } from '../types/index.ts';
import consola from 'consola';

export class GitHubService {
  private octokit: Octokit;
  private owner: string;
  private repo: string;

  constructor(config: Config) {
    this.octokit = new Octokit({
      auth: config.github.token,
    });
    this.owner = config.github.owner;
    this.repo = config.github.repo;
  }

  async searchCodeForError(errorMessage: string, stackTrace?: string): Promise<ErrorAnalysis | null> {
    try {
      // Extract file path from stack trace if available
      let filePath: string | undefined;
      let lineNumber: number | undefined;

      if (stackTrace) {
        const fileMatch = stackTrace.match(/(?:at|in)\s+(?:.*?\s+)?\(?([^:()]+):(\d+)/);
        if (fileMatch) {
          filePath = fileMatch[1]?.replace(/^\//, '');
          lineNumber = parseInt(fileMatch[2] || '0', 10);
        }
      }

      // If we have a specific file, fetch its content
      if (filePath) {
        try {
          const { data } = await this.octokit.repos.getContent({
            owner: this.owner,
            repo: this.repo,
            path: filePath,
          });

          if ('content' in data && data.content) {
            const content = Buffer.from(data.content, 'base64').toString('utf-8');
            return {
              errorType: 'runtime_error',
              affectedFile: filePath,
              affectedLine: lineNumber,
              suggestedFix: this.analyzeSuggestedFix(errorMessage, content, lineNumber),
              confidence: 0.8,
            };
          }
        } catch (error) {
          consola.warn(`Could not fetch file ${filePath}:`, error);
        }
      }

      // Otherwise, search the codebase
      const searchQuery = this.extractSearchTerms(errorMessage);
      if (!searchQuery) {
        return null;
      }

      const { data } = await this.octokit.search.code({
        q: `${searchQuery} repo:${this.owner}/${this.repo}`,
        per_page: 5,
      });

      if (data.items.length > 0) {
        const firstMatch = data.items[0];
        return {
          errorType: 'code_reference',
          affectedFile: firstMatch?.path,
          confidence: 0.6,
        };
      }

      return null;
    } catch (error) {
      consola.error('Error searching GitHub code:', error);
      return null;
    }
  }

  private extractSearchTerms(errorMessage: string): string | null {
    // Extract function names, variable names, or specific error messages
    const patterns = [
      /function\s+(\w+)/i,
      /at\s+(\w+)/i,
      /(\w+Error):/,
      /Cannot\s+read\s+property\s+'(\w+)'/i,
      /(\w+)\s+is\s+not\s+defined/i,
    ];

    for (const pattern of patterns) {
      const match = errorMessage.match(pattern);
      if (match?.[1]) {
        return match[1];
      }
    }

    // Fallback: use first meaningful word
    const words = errorMessage.split(/\s+/).filter(w => w.length > 3);
    return words[0] || null;
  }

  private analyzeSuggestedFix(errorMessage: string, fileContent: string, lineNumber?: number): string {
    // This is a simplified suggestion logic
    const suggestions: string[] = [];

    if (errorMessage.includes('null') || errorMessage.includes('undefined')) {
      suggestions.push('Add null/undefined checks before accessing properties');
    }

    if (errorMessage.includes('TypeError')) {
      suggestions.push('Verify variable types and add type guards');
    }

    if (errorMessage.includes('not a function')) {
      suggestions.push('Check if the method exists and is properly imported');
    }

    if (lineNumber && fileContent) {
      suggestions.push(`Review code around line ${lineNumber}`);
    }

    return suggestions.join('. ') || 'Review the affected code section';
  }

  async createIssue(title: string, body: string, labels: string[] = ['bug', 'automated']): Promise<number | null> {
    try {
      const { data } = await this.octokit.issues.create({
        owner: this.owner,
        repo: this.repo,
        title,
        body,
        labels,
      });

      consola.success(`Created issue #${data.number}: ${title}`);
      return data.number;
    } catch (error) {
      consola.error('Error creating GitHub issue:', error);
      return null;
    }
  }

  async createPullRequest(
    title: string,
    body: string,
    branch: string,
    changes: Array<{ path: string; content: string }>
  ): Promise<number | null> {
    try {
      // Get the default branch
      const { data: repoData } = await this.octokit.repos.get({
        owner: this.owner,
        repo: this.repo,
      });
      const baseBranch = repoData.default_branch;

      // Get the latest commit on the base branch
      const { data: refData } = await this.octokit.git.getRef({
        owner: this.owner,
        repo: this.repo,
        ref: `heads/${baseBranch}`,
      });
      const baseCommitSha = refData.object.sha;

      // Create a new branch
      await this.octokit.git.createRef({
        owner: this.owner,
        repo: this.repo,
        ref: `refs/heads/${branch}`,
        sha: baseCommitSha,
      });

      // Create blobs and tree for the changes
      const tree = await Promise.all(
        changes.map(async (change) => {
          const { data: blob } = await this.octokit.git.createBlob({
            owner: this.owner,
            repo: this.repo,
            content: Buffer.from(change.content).toString('base64'),
            encoding: 'base64',
          });

          return {
            path: change.path,
            mode: '100644' as const,
            type: 'blob' as const,
            sha: blob.sha,
          };
        })
      );

      // Create a new tree
      const { data: newTree } = await this.octokit.git.createTree({
        owner: this.owner,
        repo: this.repo,
        base_tree: baseCommitSha,
        tree,
      });

      // Create a commit
      const { data: newCommit } = await this.octokit.git.createCommit({
        owner: this.owner,
        repo: this.repo,
        message: title,
        tree: newTree.sha,
        parents: [baseCommitSha],
      });

      // Update the branch reference
      await this.octokit.git.updateRef({
        owner: this.owner,
        repo: this.repo,
        ref: `heads/${branch}`,
        sha: newCommit.sha,
      });

      // Create pull request
      const { data: pr } = await this.octokit.pulls.create({
        owner: this.owner,
        repo: this.repo,
        title,
        body,
        head: branch,
        base: baseBranch,
      });

      consola.success(`Created PR #${pr.number}: ${title}`);
      return pr.number;
    } catch (error) {
      consola.error('Error creating GitHub PR:', error);
      return null;
    }
  }

  async checkIfIssueExists(title: string): Promise<boolean> {
    try {
      const { data } = await this.octokit.issues.listForRepo({
        owner: this.owner,
        repo: this.repo,
        state: 'open',
        per_page: 100,
      });

      return data.some(issue => issue.title === title);
    } catch (error) {
      consola.error('Error checking existing issues:', error);
      return false;
    }
  }
}
