# Integration Guide

This guide provides step-by-step instructions for integrating the Error Monitoring System with various services.

## Table of Contents

1. [GitHub Setup](#github-setup)
2. [AWS CloudWatch Integration](#aws-cloudwatch-integration)
3. [Sentry Integration](#sentry-integration)
4. [Slack Integration](#slack-integration)
5. [Testing Integrations](#testing-integrations)

---

## GitHub Setup

### 1. Create a Personal Access Token

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Give it a descriptive name: "Error Monitoring System"
4. Select the following scopes:
   - ✅ `repo` (Full control of private repositories)
   - ✅ `workflow` (Update GitHub Actions workflows) - optional
5. Click "Generate token"
6. Copy the token immediately (you won't see it again)

### 2. Configure Environment Variables

Add to your `.env` file:

```env
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxx
GITHUB_OWNER=your-username-or-org
GITHUB_REPO=your-repository-name
```

### 3. Test the Connection

```bash
curl -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/user
```

You should see your GitHub user information.

---

## AWS CloudWatch Integration

### 1. Create IAM User

1. Go to AWS Console → IAM → Users
2. Click "Add users"
3. Username: `error-monitoring-service`
4. Select "Access key - Programmatic access"
5. Click "Next: Permissions"

### 2. Create IAM Policy

Create a custom policy with minimal permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:FilterLogEvents",
        "logs:DescribeLogStreams",
        "logs:GetLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:log-group:/aws/ecs/your-app:*"
    }
  ]
}
```

### 3. Attach Policy to User

1. Attach the custom policy to the IAM user
2. Complete the user creation
3. Download the credentials (CSV file)

### 4. Configure Environment Variables

Add to your `.env` file:

```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AWS_LOG_GROUP_NAME=/aws/ecs/your-app
```

### 5. Find Your Log Group Name

List all log groups:

```bash
aws logs describe-log-groups --query 'logGroups[*].logGroupName'
```

For ECS applications, the log group is typically:
- `/aws/ecs/{service-name}`
- `/ecs/{cluster-name}/{service-name}`

For Amplify applications:
- `/aws/amplify/{app-id}`

### 6. Test CloudWatch Access

```bash
aws logs filter-log-events \
  --log-group-name "$AWS_LOG_GROUP_NAME" \
  --filter-pattern "ERROR" \
  --max-items 5
```

---

## Sentry Integration

### 1. Get Sentry DSN

1. Go to your Sentry project
2. Settings → Client Keys (DSN)
3. Copy the DSN URL

### 2. Create Sentry Auth Token (Optional)

Required for fetching additional issue details:

1. Go to Sentry → Settings → Auth Tokens
2. Click "Create New Token"
3. Give it a name: "Error Monitoring System"
4. Select scopes:
   - ✅ `project:read`
   - ✅ `event:read`
5. Click "Create Token"
6. Copy the token

### 3. Configure Environment Variables

Add to your `.env` file:

```env
SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
SENTRY_AUTH_TOKEN=sntrys_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENTRY_ORGANIZATION=your-org-name
SENTRY_PROJECT=your-project-name
```

### 4. Set Up Sentry Webhook

1. Go to your Sentry project
2. Settings → Integrations → WebHooks
3. Add a webhook:
   - **URL**: `https://your-domain.com/webhook/sentry`
   - **Events**: Select the following:
     - ✅ `issue.created` - When a new issue is created
     - ✅ `event.alert` - When an alert fires
     - ✅ `error` - Error events
4. Click "Save Changes"

### 5. Test Sentry Integration

Send a test event:

```bash
curl -X POST https://your-domain.com/webhook/sentry \
  -H "Content-Type: application/json" \
  -d @examples/sentry-webhook-example.json
```

Or trigger a real error in your application to test end-to-end.

---

## Slack Integration

### Option 1: Incoming Webhook (Simple)

#### 1. Create Slack Webhook

1. Go to https://api.slack.com/apps
2. Click "Create New App"
3. Choose "From scratch"
4. Name: "Error Monitoring System"
5. Select your workspace
6. Click "Create App"
7. Go to "Incoming Webhooks"
8. Activate Incoming Webhooks
9. Click "Add New Webhook to Workspace"
10. Select the channel where errors should be posted
11. Copy the webhook URL

#### 2. Configure Environment Variables

Add to your `.env` file:

```env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX
```

### Option 2: Slack Bot (Advanced)

For two-way integration where Slack sends webhooks to your system:

#### 1. Create Slack App

Follow steps 1-6 from Option 1.

#### 2. Enable Bot User

1. Go to "OAuth & Permissions"
2. Add Bot Token Scopes:
   - `chat:write`
   - `chat:write.public`
3. Install the app to your workspace
4. Copy the "Bot User OAuth Token"

#### 3. Configure Slash Commands or Event Subscriptions

1. Go to "Slash Commands" or "Event Subscriptions"
2. Add request URL: `https://your-domain.com/webhook/slack`
3. Subscribe to bot events:
   - `message.channels`
   - `app_mention`

#### 4. Configure Environment Variables

Add to your `.env` file:

```env
SLACK_BOT_TOKEN=xoxb-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 3. Forward ECS/Amplify Alerts to Monitoring System

Since your ECS applications already send Slack alerts, you need to forward them:

#### Using Slack Workflow Builder:

1. In Slack, go to your workspace
2. Open Workflow Builder
3. Create a new workflow:
   - **Trigger**: "When a message is posted to a channel"
   - **Channel**: Select your error alerts channel
   - **Condition**: Message contains "error" or "exception"
   - **Action**: Send a webhook request
   - **URL**: `https://your-domain.com/webhook/slack`
   - **Body**: Include message content

#### Using AWS Lambda (Alternative):

Create a Lambda function that:
1. Receives the error from your ECS app
2. Sends to both Slack AND your monitoring system

```javascript
// Lambda function example
exports.handler = async (event) => {
  const errorMessage = event.message;
  
  // Send to Slack
  await fetch(process.env.SLACK_WEBHOOK_URL, {
    method: 'POST',
    body: JSON.stringify({ text: errorMessage })
  });
  
  // Send to monitoring system
  await fetch(process.env.MONITORING_WEBHOOK_URL, {
    method: 'POST',
    body: JSON.stringify({ text: errorMessage })
  });
};
```

---

## Testing Integrations

### Test All Integrations

Run the setup test:

```bash
./test-setup.sh
```

### Test GitHub Integration

```bash
# Test API access
curl -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$GITHUB_OWNER/$GITHUB_REPO

# Test issue creation
bun start
```

### Test AWS CloudWatch Integration

```bash
# Test log access
curl -X POST http://localhost:3000/trigger-scan
```

### Test Sentry Integration

```bash
# Test webhook
curl -X POST http://localhost:3000/webhook/sentry \
  -H "Content-Type: application/json" \
  -d @examples/sentry-webhook-example.json
```

### Test Slack Integration

```bash
# Test webhook
curl -X POST http://localhost:3000/webhook/slack \
  -H "Content-Type: application/json" \
  -d @examples/slack-webhook-example.json
```

---

## Troubleshooting

### GitHub Integration Issues

**Problem**: "Bad credentials" error

**Solution**: 
1. Verify your token is correct
2. Check token hasn't expired
3. Ensure token has `repo` scope

**Problem**: "Resource not accessible by personal access token"

**Solution**: 
- For organization repositories, ensure SSO is authorized for the token
- Go to GitHub → Settings → Personal access tokens → Click "Configure SSO"

### AWS CloudWatch Issues

**Problem**: "AccessDeniedException"

**Solution**: 
1. Verify IAM policy is attached to the user
2. Check the log group name is correct
3. Ensure the region is correct

**Problem**: "No logs found"

**Solution**:
- Verify your ECS/Amplify app is actually writing logs to CloudWatch
- Check the log group name matches exactly
- Try increasing the time window (e.g., 180 minutes instead of 60)

### Sentry Integration Issues

**Problem**: Webhooks not being received

**Solution**:
1. Ensure your server is publicly accessible
2. Check webhook URL is correct
3. Verify webhook is enabled in Sentry
4. Check Sentry's webhook delivery logs

### Slack Integration Issues

**Problem**: Webhooks failing

**Solution**:
1. Verify the webhook URL is still valid
2. Check if the channel still exists
3. Ensure the app hasn't been uninstalled

---

## Security Best Practices

1. **Never commit credentials** to version control
2. **Use environment variables** for all sensitive data
3. **Rotate credentials** regularly (every 90 days)
4. **Use least-privilege** IAM policies
5. **Enable webhook signature validation** in production
6. **Use HTTPS** for all webhook endpoints
7. **Monitor access logs** for suspicious activity

---

## Next Steps

After setting up all integrations:

1. Deploy the system (see [DEPLOYMENT.md](DEPLOYMENT.md))
2. Test with real errors (see [TESTING.md](TESTING.md))
3. Monitor the system logs
4. Adjust configuration as needed
5. Set up monitoring alerts

---

For more information, see:
- [README.md](README.md) - Overview and installation
- [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment options
- [TESTING.md](TESTING.md) - Testing procedures
