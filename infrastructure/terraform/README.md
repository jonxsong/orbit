# Google Cloud deployment

This configuration prepares Cloud Run, Cloud SQL for PostgreSQL, Secret Manager, and a least-privilege runtime service account. Secret values are deliberately not accepted by Terraform, which keeps them out of Terraform state.

Before the first service rollout:

1. Enable the Cloud Run, Cloud SQL Admin, Secret Manager, Artifact Registry, and IAM APIs.
2. Build and push an immutable API image, then pass its digest as `container_image`.
3. Create a PostgreSQL role/password outside Terraform.
4. Add the complete Cloud SQL Unix-socket `DATABASE_URL` as a version of `orbit-database-url`.
5. Add the server-only OpenAI key as a version of `orbit-openai-api-key`.
6. Apply migrations using a one-off Cloud Run job or an authenticated workstation connection.
7. Configure the chosen OIDC provider and pass its issuer and API audience.

```bash
terraform init
terraform plan -var-file=production.tfvars
terraform apply -var-file=production.tfvars
```

The service allows unauthenticated Cloud Run invocation by default because native mobile clients cannot hold Google service credentials. Orbit's own OIDC middleware still protects every `/v1` endpoint. Health endpoints contain no user data.

