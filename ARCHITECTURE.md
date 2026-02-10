# System Architecture

## Overview

The Error Monitoring System is designed to automatically detect, analyze, and respond to errors from multiple sources by creating GitHub issues or pull requests.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ERROR SOURCES                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐          │
│  │   Sentry     │    │    Slack     │    │  CloudWatch  │          │
│  │   Events     │    │   Alerts     │    │     Logs     │          │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘          │
│         │                   │                    │                   │
│         │ Webhooks          │ Webhooks           │ Polling/Scan      │
│         │                   │                    │                   │
└─────────┼───────────────────┼────────────────────┼───────────────────┘
          │                   │                    │
          │                   │                    │
          ▼                   ▼                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    ERROR MONITORING SYSTEM                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │                    Webhook Server                           │     │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │     │
│  │  │   /webhook/  │  │   /webhook/  │  │ /trigger-    │     │     │
│  │  │    sentry    │  │    slack     │  │    scan      │     │     │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │     │
│  └─────────┼──────────────────┼──────────────────┼───────────┘     │
│            │                  │                  │                   │
│            └──────────────────┼──────────────────┘                   │
│                              │                                       │
│                              ▼                                       │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │                   Webhook Handler                           │     │
│  │  • Parses Slack payloads                                    │     │
│  │  • Parses Sentry payloads                                   │     │
│  │  • Validates webhook signatures                             │     │
│  │  • Converts to ErrorEvent format                            │     │
│  └────────────────────────┬───────────────────────────────────┘     │
│                           │                                          │
│                           ▼                                          │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │                   Error Analyzer                            │     │
│  │  • Analyzes error messages                                  │     │
│  │  • Extracts stack traces                                    │     │
│  │  • Identifies affected files                                │     │
│  │  • Determines confidence level                              │     │
│  │  • Suggests fixes                                           │     │
│  └────────────────────────┬───────────────────────────────────┘     │
│                           │                                          │
│           ┌───────────────┴───────────────┐                         │
│           │                               │                         │
│           ▼                               ▼                         │
│  ┌─────────────────┐            ┌─────────────────┐                │
│  │  GitHub Service │            │ CloudWatch Svc  │                │
│  │  • Search code  │            │ • Fetch logs    │                │
│  │  • Create issues│            │ • Search logs   │                │
│  │  • Create PRs   │            │ • Filter errors │                │
│  └────────┬────────┘            └─────────────────┘                │
│           │                                                          │
│           ▼                                                          │
│  ┌─────────────────┐                                                │
│  │ Decision Engine │                                                │
│  │ • High confidence → Create PR                                    │
│  │ • Low confidence  → Create Issue                                 │
│  │ • Check duplicates                                               │
│  └────────┬────────┘                                                │
└───────────┼──────────────────────────────────────────────────────────┘
            │
            │
            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         GITHUB REPOSITORY                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────┐                        ┌──────────────┐           │
│  │   Issues     │                        │  Pull        │           │
│  │              │                        │  Requests    │           │
│  │  • [Auto]    │                        │              │           │
│  │    Error:... │                        │  • [Auto     │           │
│  │              │                        │    Fix]...   │           │
│  │  Contains:   │                        │              │           │
│  │  - Error msg │                        │  Contains:   │           │
│  │  - Stack     │                        │  - Fix code  │           │
│  │  - File/line │                        │  - Tests     │           │
│  │  - Suggested │                        │  - Analysis  │           │
│  │    fix       │                        │              │           │
│  └──────────────┘                        └──────────────┘           │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. Error Sources

#### Sentry
- **Type**: Real-time error tracking
- **Integration**: Webhook
- **Data**: Error events with stack traces
- **Trigger**: New issue created, alert fired

#### Slack
- **Type**: Alert notifications
- **Integration**: Webhook forwarding
- **Data**: Error messages from ECS/Amplify
- **Trigger**: Error messages posted to channels

#### AWS CloudWatch
- **Type**: Log aggregation
- **Integration**: AWS SDK polling
- **Data**: Application logs from ECS/Amplify
- **Trigger**: Scheduled scans or manual trigger

### 2. Error Monitoring System

#### Webhook Server
- **Runtime**: Bun.js
- **Port**: 3000 (configurable)
- **Endpoints**:
  - `POST /webhook/slack` - Receive Slack alerts
  - `POST /webhook/sentry` - Receive Sentry events
  - `POST /trigger-scan` - Manual CloudWatch scan
  - `GET /health` - Health check

#### Webhook Handler
- **Purpose**: Parse and normalize error data
- **Input**: Raw webhook payloads
- **Output**: Normalized `ErrorEvent` objects
- **Features**:
  - Payload validation
  - Signature verification
  - Error detection and classification

#### Error Analyzer
- **Purpose**: Analyze errors and determine actions
- **Process**:
  1. Parse error message and stack trace
  2. Search GitHub repository for affected code
  3. Fetch related CloudWatch logs
  4. Calculate confidence score
  5. Suggest fixes
  6. Decide on issue vs PR creation

#### Services

**GitHub Service**
- Search code for error patterns
- Extract file paths from stack traces
- Create GitHub issues with detailed reports
- Create pull requests with fixes (when confident)
- Check for duplicate issues

**CloudWatch Service**
- Connect to AWS CloudWatch Logs
- Filter logs for error patterns
- Fetch recent error events
- Search for specific error messages

**Sentry Service**
- Parse Sentry webhook payloads
- Extract stack traces and error details
- Fetch additional issue details via API

### 3. Decision Logic

```
Error Received
     │
     ├─→ Parse & Extract Info
     │
     ├─→ Search GitHub Code
     │       │
     │       ├─→ Found + Stack Trace → Confidence: 0.8
     │       ├─→ Found (no stack)    → Confidence: 0.6
     │       └─→ Not Found           → Confidence: 0.3
     │
     ├─→ Search CloudWatch Logs
     │       │
     │       └─→ Found → +0.1 Confidence
     │
     ├─→ Analyze & Suggest Fix
     │
     └─→ Decision:
         │
         ├─→ Confidence > 0.8 + Has Suggestion → Create PR
         └─→ Otherwise → Create Issue
```

## Data Flow

### 1. Webhook Flow (Real-time)

```
Error Occurs
     ↓
Sentry/Slack Sends Webhook
     ↓
Webhook Handler Receives & Parses
     ↓
Error Analyzer Processes
     ↓
GitHub Service Searches Code
     ↓
CloudWatch Service Fetches Logs (optional)
     ↓
Issue/PR Created on GitHub
     ↓
Developer Notified
```

### 2. Polling Flow (Scheduled)

```
GitHub Action Triggers (Hourly)
     ↓
CloudWatch Service Fetches Recent Errors
     ↓
For Each Error:
     ↓
Error Analyzer Processes
     ↓
GitHub Service Searches Code
     ↓
Issue Created on GitHub (if not duplicate)
     ↓
Developer Notified
```

## Deployment Architectures

### Architecture 1: GitHub Actions Only

```
┌────────────────────────────────────┐
│   GitHub Actions (Scheduled)       │
│                                    │
│   Every Hour:                      │
│   1. Fetch CloudWatch Logs         │
│   2. Analyze Errors                │
│   3. Create GitHub Issues          │
│                                    │
└────────────────────────────────────┘
```

**Pros**: Free, no server maintenance
**Cons**: Scheduled only, no real-time webhooks

### Architecture 2: ECS + Webhooks

```
┌────────────────────────────────────┐
│   Application Load Balancer        │
│   (Optional SSL/HTTPS)             │
└──────────────┬─────────────────────┘
               │
               ▼
┌────────────────────────────────────┐
│   ECS Service (Fargate)            │
│                                    │
│   • Error Monitoring Container     │
│   • Auto-scaling (1-3 tasks)       │
│   • Health checks                  │
│                                    │
└────────────────────────────────────┘
```

**Pros**: Real-time webhooks, scalable, highly available
**Cons**: Cost (~$15-30/month)

### Architecture 3: Hybrid

```
┌──────────────────────────────────────┐
│  GitHub Actions (Scheduled)          │
│  • Hourly CloudWatch scans           │
│  • Backup error detection            │
└──────────────────────────────────────┘
               +
┌──────────────────────────────────────┐
│  ECS Service (Webhooks)              │
│  • Real-time Sentry/Slack webhooks   │
│  • Immediate error response          │
└──────────────────────────────────────┘
```

**Pros**: Best of both worlds
**Cons**: Most complex setup

## Security Considerations

### 1. Credentials Management
- All secrets stored in environment variables
- Never committed to repository
- Use AWS Secrets Manager or GitHub Secrets
- Rotate credentials regularly

### 2. Webhook Security
- Implement signature verification
- Use HTTPS for all webhook endpoints
- Rate limiting to prevent abuse
- IP allowlisting (optional)

### 3. GitHub Access
- Use least-privilege tokens
- Separate tokens for different environments
- Monitor token usage via GitHub API

### 4. AWS Access
- Use IAM roles (when running on AWS)
- Minimal CloudWatch permissions
- Separate credentials per environment

## Scalability

### Current Limits
- GitHub API: 5000 requests/hour
- CloudWatch: 5 requests/second
- Webhook processing: ~100 requests/second

### Scaling Strategies

**Horizontal Scaling**
- Multiple ECS tasks behind load balancer
- Each task processes webhooks independently

**Queue-Based Processing**
- Add SQS queue between webhooks and processing
- Decouple receipt from processing
- Handle traffic spikes

**Caching**
- Cache GitHub API responses
- Cache CloudWatch log queries
- Reduce duplicate processing

**Rate Limiting**
- Implement backoff for GitHub API
- Batch CloudWatch queries
- Throttle webhook processing

## Monitoring

### Metrics to Track
- Webhooks received per minute
- Errors processed per hour
- GitHub issues created per day
- API rate limit remaining
- Processing time per error
- Memory and CPU usage

### Logging
- All errors logged to console
- CloudWatch logs (when on ECS)
- Structured logging with metadata
- Error categorization

### Alerts
- Server downtime
- API rate limit warnings
- Processing failures
- Memory/CPU threshold exceeded

## Future Enhancements

1. **Machine Learning**
   - Learn from past fixes
   - Improve confidence scoring
   - Auto-categorize errors

2. **Auto-Fix Generation**
   - Generate actual code fixes
   - Run tests before creating PR
   - Auto-merge safe fixes

3. **Multi-Repository Support**
   - Monitor multiple repositories
   - Cross-repository error correlation
   - Shared error patterns

4. **Advanced Analytics**
   - Error trends dashboard
   - Most common error types
   - MTTR (Mean Time To Resolution)
   - Error rate by service

5. **Integration Expansion**
   - Datadog integration
   - New Relic integration
   - PagerDuty integration
   - Jira integration

---

For implementation details, see the source code in the `src/` directory.
