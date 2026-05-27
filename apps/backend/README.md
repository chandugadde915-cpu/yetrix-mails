# Backend

NestJS-style API intended for AWS ECS Fargate or EC2.

## Main Services

- `GET /health`
- `GET /domains`
- `POST /domains`
- `GET /domains/:domain/dns-records`
- `GET /dns/:domain/check`
- `GET /mailboxes`
- `POST /mailboxes`

## AWS Deployment

Build and push the Docker image to ECR, then use the example task definition in:

```text
infra/aws/task-definition-backend.example.json
```
