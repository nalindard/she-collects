# Deployment Guide

This guide covers different deployment strategies for the Error Monitoring System.

## Table of Contents

1. [GitHub Actions (Scheduled)](#github-actions-scheduled)
2. [AWS ECS (Webhook Server)](#aws-ecs-webhook-server)
3. [AWS Lambda (Serverless)](#aws-lambda-serverless)
4. [Docker Compose](#docker-compose)
5. [Manual Server](#manual-server)

---

## GitHub Actions (Scheduled)

The simplest deployment option for periodic CloudWatch scanning.

### Setup

1. **Configure Secrets** in your GitHub repository:
   - Go to Settings → Secrets and variables → Actions
   - Add the following secrets:
     - `AWS_REGION`
     - `AWS_ACCESS_KEY_ID`
     - `AWS_SECRET_ACCESS_KEY`
     - `AWS_LOG_GROUP_NAME`
     - `SENTRY_DSN` (optional)
     - `SENTRY_AUTH_TOKEN` (optional)
     - `SENTRY_ORGANIZATION` (optional)
     - `SENTRY_PROJECT` (optional)

2. **Enable Workflow**:
   - The workflow at `.github/workflows/error-monitoring.yml` is already configured
   - It runs hourly and can be triggered manually

3. **Verify**:
   - Go to Actions tab in your GitHub repository
   - Click on "Error Monitoring System" workflow
   - Click "Run workflow" to test manually

### Advantages
- ✅ No server maintenance required
- ✅ Free on GitHub public repositories
- ✅ Automatic scaling and reliability

### Limitations
- ⚠️ Scheduled only (not real-time webhooks)
- ⚠️ 6-hour maximum execution time

---

## AWS ECS (Webhook Server)

Recommended for production use with real-time webhook processing.

### Prerequisites

- AWS CLI configured
- Docker installed
- ECR repository created

### Setup

1. **Create ECR Repository**:
```bash
aws ecr create-repository --repository-name error-monitoring-system
```

2. **Build and Push Docker Image**:
```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Build image
docker build -t error-monitoring-system .

# Tag and push
docker tag error-monitoring-system:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/error-monitoring-system:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/error-monitoring-system:latest
```

3. **Create ECS Task Definition**:
```json
{
  "family": "error-monitoring-system",
  "networkMode": "awsvpc",
  "containerDefinitions": [
    {
      "name": "error-monitoring",
      "image": "<account-id>.dkr.ecr.us-east-1.amazonaws.com/error-monitoring-system:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "PORT", "value": "3000"}
      ],
      "secrets": [
        {"name": "GITHUB_TOKEN", "valueFrom": "arn:aws:secretsmanager:..."},
        {"name": "AWS_ACCESS_KEY_ID", "valueFrom": "arn:aws:secretsmanager:..."}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/error-monitoring",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ],
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512"
}
```

4. **Create ECS Service**:
```bash
aws ecs create-service \
  --cluster your-cluster \
  --service-name error-monitoring \
  --task-definition error-monitoring-system \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"
```

5. **Configure Load Balancer** (Optional):
   - Create an Application Load Balancer
   - Point it to your ECS service
   - Configure SSL certificate

### Environment Variables via AWS Secrets Manager

Store sensitive data in AWS Secrets Manager and reference in task definition:

```bash
aws secretsmanager create-secret \
  --name error-monitoring/github-token \
  --secret-string "your-github-token"
```

---

## AWS Lambda (Serverless)

For event-driven, serverless deployment.

### Setup

1. **Create Deployment Package**:
```bash
# Install dependencies
npm install

# Create package
zip -r function.zip src/ node_modules/ package.json
```

2. **Create Lambda Function**:
```bash
aws lambda create-function \
  --function-name error-monitoring \
  --runtime nodejs18.x \
  --role arn:aws:iam::account-id:role/lambda-role \
  --handler src/index.handler \
  --zip-file fileb://function.zip \
  --timeout 60 \
  --memory-size 512 \
  --environment Variables={GITHUB_TOKEN=xxx,GITHUB_OWNER=xxx,GITHUB_REPO=xxx}
```

3. **Configure EventBridge Schedule**:
```bash
aws events put-rule \
  --name error-monitoring-schedule \
  --schedule-expression "rate(1 hour)"

aws events put-targets \
  --rule error-monitoring-schedule \
  --targets "Id=1,Arn=arn:aws:lambda:region:account-id:function:error-monitoring"
```

4. **Configure API Gateway** (for webhooks):
   - Create REST API
   - Add POST endpoints for `/webhook/slack` and `/webhook/sentry`
   - Connect to Lambda function

---

## Docker Compose

For local development or simple server deployment.

### docker-compose.yml

```yaml
version: '3.8'

services:
  error-monitoring:
    build: .
    ports:
      - "3000:3000"
    environment:
      - GITHUB_TOKEN=${GITHUB_TOKEN}
      - GITHUB_OWNER=${GITHUB_OWNER}
      - GITHUB_REPO=${GITHUB_REPO}
      - AWS_REGION=${AWS_REGION}
      - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
      - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
      - AWS_LOG_GROUP_NAME=${AWS_LOG_GROUP_NAME}
      - SENTRY_DSN=${SENTRY_DSN}
      - PORT=3000
    env_file:
      - .env
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### Dockerfile

```dockerfile
FROM oven/bun:latest

WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install --production

COPY . .

EXPOSE 3000

CMD ["bun", "run", "server"]
```

### Run

```bash
docker-compose up -d
```

---

## Manual Server

For running on a dedicated server or VM.

### Prerequisites

- Node.js 18+ or Bun installed
- Git
- PM2 (process manager)

### Setup

1. **Clone and Install**:
```bash
git clone https://github.com/nalindard/she-collects.git
cd she-collects
bun install
```

2. **Configure Environment**:
```bash
cp .env.example .env
nano .env  # Edit with your values
```

3. **Install PM2**:
```bash
npm install -g pm2
```

4. **Start Service**:
```bash
pm2 start bun --name error-monitoring -- run server
pm2 save
pm2 startup  # Follow instructions to enable auto-start
```

5. **Monitor**:
```bash
pm2 logs error-monitoring
pm2 status
```

### Nginx Reverse Proxy (Optional)

```nginx
server {
    listen 80;
    server_name monitoring.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Webhook Configuration

### Sentry

1. Go to your Sentry project
2. Settings → Integrations → WebHooks
3. Add webhook URL: `https://your-domain.com/webhook/sentry`
4. Select events: `issue.created`, `event.alert`

### Slack

1. Create a Slack App or use Incoming Webhooks
2. Configure your app to forward to: `https://your-domain.com/webhook/slack`
3. Or use Slack Workflow Builder to forward messages

### Testing Webhooks

```bash
# Test Slack webhook
curl -X POST http://localhost:3000/webhook/slack \
  -H "Content-Type: application/json" \
  -d '{"text": "Error: Something went wrong in production"}'

# Test Sentry webhook
curl -X POST http://localhost:3000/webhook/sentry \
  -H "Content-Type: application/json" \
  -d @test-sentry-payload.json

# Manual scan trigger
curl -X POST http://localhost:3000/trigger-scan
```

---

## Monitoring & Logs

### CloudWatch Logs (AWS)

Logs are automatically sent to CloudWatch when running on ECS/Lambda.

### Application Logs

```bash
# PM2
pm2 logs error-monitoring

# Docker
docker logs -f error-monitoring

# ECS
aws logs tail /ecs/error-monitoring --follow
```

---

## Security Best Practices

1. **Never commit secrets** to version control
2. **Use IAM roles** instead of access keys when running on AWS
3. **Enable webhook signature validation** for production
4. **Use HTTPS** for all webhook endpoints
5. **Implement rate limiting** to prevent abuse
6. **Rotate credentials** regularly
7. **Use least-privilege IAM policies**

### Example IAM Policy for CloudWatch

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:FilterLogEvents",
        "logs:DescribeLogStreams"
      ],
      "Resource": "arn:aws:logs:*:*:log-group:your-log-group:*"
    }
  ]
}
```

---

## Troubleshooting

### Common Issues

1. **Webhook not receiving data**
   - Check firewall/security groups
   - Verify webhook URL is publicly accessible
   - Test with curl

2. **GitHub API rate limiting**
   - Use GitHub App token instead of PAT
   - Implement caching

3. **CloudWatch access denied**
   - Verify IAM permissions
   - Check AWS credentials

4. **Memory issues**
   - Increase container memory
   - Implement pagination for large log queries

---

## Scaling Considerations

- **High Volume**: Use SQS queue between webhook receipt and processing
- **Multiple Repos**: Deploy separate instances or add repo routing
- **Global**: Deploy in multiple regions with CloudFront
- **Cost Optimization**: Use Lambda for low-traffic, ECS for steady load

---

## Support

For issues or questions, please open a GitHub issue in the repository.
