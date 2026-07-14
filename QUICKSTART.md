# Quick Start Guide

Get the Error Monitoring System up and running in 5 minutes.

## Prerequisites

- [Bun](https://bun.sh) or Node.js 18+
- GitHub account with repository access
- (Optional) AWS, Sentry, or Slack accounts

## Step 1: Clone and Install

```bash
git clone https://github.com/nalindard/she-collects.git
cd she-collects
bun install  # or npm install
```

## Step 2: Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and add your GitHub credentials:

```env
GITHUB_TOKEN=your_github_token_here
GITHUB_OWNER=your_username
GITHUB_REPO=your_repo_name
```

### How to get a GitHub token:

1. Go to GitHub → Settings → Developer settings → Personal access tokens
2. Generate new token (classic)
3. Select `repo` scope
4. Copy the token

## Step 3: Test the Setup

```bash
./test-setup.sh
```

You should see:
```
✅ Setup complete! You can now run:
  • bun start          - Scan CloudWatch logs
  • bun run server     - Start webhook server
  • docker-compose up  - Run in Docker
```

## Step 4: Choose Your Mode

### Option A: Webhook Server (Recommended)

For real-time error monitoring:

```bash
bun run server
```

The server will start on port 3000 and listen for webhooks from Slack, Sentry, etc.

**Test it**:
```bash
curl -X POST http://localhost:3000/webhook/slack \
  -H "Content-Type: application/json" \
  -d '{"text": "Error: Test error message"}'
```

### Option B: Scheduled Scanning

For periodic CloudWatch log scanning:

1. **Configure AWS credentials** in `.env`:
   ```env
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=your_key
   AWS_SECRET_ACCESS_KEY=your_secret
   AWS_LOG_GROUP_NAME=/aws/ecs/your-app
   ```

2. **Run the scanner**:
   ```bash
   bun start
   ```

3. **Or use GitHub Actions** (already configured in `.github/workflows/error-monitoring.yml`)

## Step 5: Verify It Works

1. Check if the application is running:
   ```bash
   curl http://localhost:3000/health
   ```

2. Trigger a test scan:
   ```bash
   curl -X POST http://localhost:3000/trigger-scan
   ```

3. Check your GitHub repository for new issues

## What's Next?

### Set Up Integrations

- [AWS CloudWatch](INTEGRATION.md#aws-cloudwatch-integration)
- [Sentry](INTEGRATION.md#sentry-integration)
- [Slack](INTEGRATION.md#slack-integration)

### Deploy to Production

- [Docker](DEPLOYMENT.md#docker-compose)
- [AWS ECS](DEPLOYMENT.md#aws-ecs-webhook-server)
- [GitHub Actions](DEPLOYMENT.md#github-actions-scheduled)

### Test Your System

Follow the [Testing Guide](TESTING.md) for comprehensive testing instructions.

## Common Use Cases

### Use Case 1: Monitor Production Errors

Set up Sentry webhooks to automatically create GitHub issues when errors occur:

1. Configure Sentry integration (see [INTEGRATION.md](INTEGRATION.md))
2. Deploy webhook server
3. Set up Sentry webhooks
4. Test with a real error

### Use Case 2: CloudWatch Log Scanning

Periodically scan AWS CloudWatch logs and create issues:

1. Configure AWS credentials
2. Set up GitHub Actions workflow
3. Errors are automatically scanned every hour

### Use Case 3: Slack Alert Integration

Forward Slack alerts to create GitHub issues:

1. Configure Slack integration
2. Set up webhook forwarding
3. Errors sent to Slack also create GitHub issues

## Troubleshooting

### "Module not found" errors

```bash
bun install  # or npm install
```

### "Bad credentials" error

Your GitHub token is invalid. Generate a new one.

### Webhooks not working

1. Ensure server is running: `curl http://localhost:3000/health`
2. Check logs for errors
3. Verify webhook URL is correct

### No issues being created

1. Check if errors are actually being received (check logs)
2. Verify GitHub token has `repo` scope
3. Check if duplicate detection is preventing creation

## Need Help?

- Read the [full README](README.md)
- Check the [Integration Guide](INTEGRATION.md)
- Review [Deployment Options](DEPLOYMENT.md)
- See [Testing Guide](TESTING.md)

## Example Workflow

Here's a typical workflow after setup:

1. **Error occurs** in your production application
2. **Sentry captures** the error and sends a webhook
3. **Monitoring system receives** the webhook
4. **System analyzes** the error and searches your GitHub code
5. **GitHub issue created** with:
   - Error message and stack trace
   - Affected file and line number
   - Suggested fixes
   - Related logs from CloudWatch
6. **You get notified** via GitHub notifications
7. **You fix the issue** and close it

That's it! Your automated error monitoring system is now running. 🎉
