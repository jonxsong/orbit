variable "project_id" {
  description = "Google Cloud project ID."
  type        = string
}

variable "region" {
  description = "Google Cloud region for Cloud Run and Cloud SQL."
  type        = string
  default     = "us-west1"
}

variable "container_image" {
  description = "Immutable Orbit API container image reference."
  type        = string
}

variable "oidc_issuer_url" {
  description = "OIDC issuer used by the mobile application."
  type        = string
}

variable "oidc_audience" {
  description = "Expected OIDC access-token audience."
  type        = string
}

variable "allow_public_invocation" {
  description = "Allow network invocation; Orbit endpoints still require application bearer tokens."
  type        = bool
  default     = true
}

