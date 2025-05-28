# AI Content Web App – Feature Overview

## 🌐 Purpose
A modern content-driven web application where Admins publish AI-related content, and Users can subscribe for premium access, interact with posts, and receive multi-channel notifications. Built with strong security and privacy foundations to support future SOC 2 Type II compliance.

## 👥 User Roles
- **User**: Sign up, manage profile, access feed, interact with posts, manage subscriptions and notifications.
- **Admin**: Dedicated login, dashboard, content management, metrics, profile/security settings.

## 📰 Core Features
- Infinite scroll feed, post cards, premium content gating
- Post interaction: like, dislike, comment, favorite
- Multi-channel notifications: Email (SendGrid), SMS (Twilio), Web Push
- Subscription & billing: Stripe Checkout, Customer Portal, webhook-driven sync
- Security: Auth0, RBAC, MFA for Admins, AWS Secrets Manager, audit logging, GDPR support

## 🧰 Technical Stack
- **Frontend**: React.js, Material UI (MUI), React Markdown, Auth0 SDK
- **Backend**: Node.js, REST API (GraphQL optional), Stripe, Auth0, Twilio, SendGrid SDKs
- **Infrastructure**: AWS (S3, CloudFront, RDS/PostgreSQL or DynamoDB, ECS Fargate/Lambda, IAM, CloudTrail, KMS, Secrets Manager, WAF, CloudWatch)

## 🏗️ Architecture Overview
- Modular monolith (v1), with potential for microservices
- Key backend services: Auth, Content, Interaction, Notification, Subscription, Admin
- External integrations: Stripe, Auth0, SendGrid, Twilio

## 📦 Initial Folder Structure
```
/src
  /services
    authService.js
    contentService.js
    interactionService.js
    subscriptionService.js
    notificationService.js
    adminService.js
  /controllers
  /routes
  /models
  /utils
  /webhooks
/config
/secrets
/tests
```

## 📈 Monitoring & Observability
- CloudWatch Alarms, structured logging (JSON), optional DataDog/Sentry/LogRocket integration

---

This project structure and documentation is based on the requirements and architecture described in Jira ticket AIP-2. 