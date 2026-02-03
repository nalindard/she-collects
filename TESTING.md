# Testing Guide

This guide explains how to test the Error Monitoring System.

## Quick Test

Run the setup test script:

```bash
./test-setup.sh
```

## Unit Testing (Manual)

### Test Configuration Loading

Create a `.env` file with test values:

```bash
cp .env.example .env
```

Edit the values and then test if config loads:

```bash
export $(cat .env | xargs)
node -e "import('./src/config.ts').then(m => console.log(m.loadConfig()))"
```

### Test CloudWatch Service

```bash
# With AWS credentials configured
export $(cat .env | xargs)
node -e "
import('./src/config.ts').then(async ({loadConfig}) => {
  const config = loadConfig();
  const {CloudWatchService} = await import('./src/services/cloudwatch.ts');
  const service = new CloudWatchService(config);
  const errors = await service.fetchRecentErrors(60);
  console.log('Errors found:', errors.length);
});
"
```

### Test GitHub Service

```bash
export $(cat .env | xargs)
node -e "
import('./src/config.ts').then(async ({loadConfig}) => {
  const config = loadConfig();
  const {GitHubService} = await import('./src/services/github.ts');
  const service = new GitHubService(config);
  const analysis = await service.searchCodeForError('TypeError', 'at index.ts:10');
  console.log('Analysis:', analysis);
});
"
```

## Integration Testing

### Test Webhook Endpoints

#### 1. Start the Server

```bash
bun run server
```

Or with custom port:

```bash
PORT=3001 bun run server
```

#### 2. Test Health Endpoint

```bash
curl http://localhost:3000/health
```

Expected response: `OK`

#### 3. Test Slack Webhook

```bash
curl -X POST http://localhost:3000/webhook/slack \
  -H "Content-Type: application/json" \
  -d @examples/slack-webhook-example.json
```

Expected response:
```json
{"success": true}
```

#### 4. Test Sentry Webhook

```bash
curl -X POST http://localhost:3000/webhook/sentry \
  -H "Content-Type: application/json" \
  -d @examples/sentry-webhook-example.json
```

Expected response:
```json
{"success": true}
```

#### 5. Test Manual Scan Trigger

```bash
curl -X POST http://localhost:3000/trigger-scan
```

Expected response:
```json
{"success": true, "errorsProcessed": 0}
```

## End-to-End Testing

### Scenario 1: Slack Error Alert → GitHub Issue

1. **Simulate a Slack error alert**:
   ```bash
   curl -X POST http://localhost:3000/webhook/slack \
     -H "Content-Type: application/json" \
     -d '{
       "text": "Error: Database connection failed in src/db/connection.ts:25"
     }'
   ```

2. **Check GitHub Issues**:
   - Go to your repository
   - Check if a new issue was created
   - Verify the issue contains error details

### Scenario 2: Sentry Error → GitHub Issue

1. **Simulate a Sentry webhook**:
   ```bash
   curl -X POST http://localhost:3000/webhook/sentry \
     -H "Content-Type: application/json" \
     -d @examples/sentry-webhook-example.json
   ```

2. **Check GitHub Issues**:
   - Verify a detailed issue was created
   - Check if stack trace is included
   - Verify affected file is identified

### Scenario 3: CloudWatch Log Scan

1. **Trigger a manual scan**:
   ```bash
   curl -X POST http://localhost:3000/trigger-scan
   ```

2. **Check the response**:
   - Should return number of errors processed
   - Check GitHub for new issues

## Docker Testing

### Build and Run

```bash
# Build the image
docker build -t error-monitoring-test .

# Run the container
docker run -p 3000:3000 --env-file .env error-monitoring-test
```

### Test in Docker

```bash
# Health check
curl http://localhost:3000/health

# Test webhook
curl -X POST http://localhost:3000/webhook/slack \
  -H "Content-Type: application/json" \
  -d '{"text": "Error in Docker test"}'
```

### Docker Compose Testing

```bash
# Start services
docker-compose up -d

# Check logs
docker-compose logs -f

# Test endpoints
curl http://localhost:3000/health

# Stop services
docker-compose down
```

## Load Testing

### Using Apache Bench

```bash
# Test health endpoint
ab -n 1000 -c 10 http://localhost:3000/health

# Test webhook endpoint
ab -n 100 -c 5 -p examples/slack-webhook-example.json \
  -T application/json http://localhost:3000/webhook/slack
```

### Using wrk

```bash
# Install wrk
# On Ubuntu: sudo apt-get install wrk
# On Mac: brew install wrk

# Test
wrk -t4 -c100 -d30s http://localhost:3000/health
```

## Performance Testing

### Memory Usage

```bash
# Start server with memory monitoring
NODE_OPTIONS="--max-old-space-size=512" bun run server &
PID=$!

# Monitor memory
while true; do
  ps -o rss= -p $PID | awk '{print $1/1024 " MB"}'
  sleep 5
done
```

### Response Time

```bash
# Test webhook response time
time curl -X POST http://localhost:3000/webhook/slack \
  -H "Content-Type: application/json" \
  -d @examples/slack-webhook-example.json
```

## CI/CD Testing

### GitHub Actions Test

1. **Push to repository**:
   ```bash
   git add .
   git commit -m "Test error monitoring"
   git push
   ```

2. **Manually trigger workflow**:
   - Go to Actions tab
   - Select "Error Monitoring System"
   - Click "Run workflow"

3. **Check logs**:
   - View workflow run
   - Check for errors
   - Verify CloudWatch scan completed

## Troubleshooting Tests

### Issue: Webhooks not working

**Test webhook signature validation**:
```bash
# Disable signature validation temporarily
# Check logs for detailed error messages
docker-compose logs -f error-monitoring
```

### Issue: GitHub API rate limiting

**Check rate limit status**:
```bash
curl -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/rate_limit
```

### Issue: AWS credentials

**Test AWS credentials**:
```bash
aws sts get-caller-identity
```

### Issue: Can't connect to CloudWatch

**Test CloudWatch access**:
```bash
aws logs describe-log-groups --log-group-name-prefix $AWS_LOG_GROUP_NAME
```

## Test Checklist

Before deploying to production, verify:

- [ ] Health endpoint responds
- [ ] Slack webhook creates issues
- [ ] Sentry webhook creates issues
- [ ] CloudWatch scan works (if configured)
- [ ] GitHub issues are created correctly
- [ ] No duplicate issues are created
- [ ] Error messages are properly formatted
- [ ] Stack traces are included when available
- [ ] Logs are readable and informative
- [ ] No sensitive data is logged
- [ ] Rate limiting is respected
- [ ] Memory usage is acceptable
- [ ] Response times are reasonable

## Automated Testing

### Create Test Suite (Future Enhancement)

```typescript
// test/integration.test.ts
import { describe, test, expect } from 'bun:test';

describe('Error Monitoring System', () => {
  test('should handle Slack webhook', async () => {
    const response = await fetch('http://localhost:3000/webhook/slack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Error test' }),
    });
    expect(response.status).toBe(200);
  });
});
```

Run tests:
```bash
bun test
```

## Monitoring in Production

### Set up alerts for:

1. **Server health**: Monitor `/health` endpoint
2. **Error processing failures**: Check logs for processing errors
3. **GitHub API failures**: Monitor rate limit and API errors
4. **AWS connection issues**: Check CloudWatch access
5. **Memory leaks**: Monitor container memory usage

---

For more information, see the [README](README.md) and [DEPLOYMENT](DEPLOYMENT.md) guides.
