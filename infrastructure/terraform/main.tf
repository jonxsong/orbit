resource "google_service_account" "api" {
  account_id   = "orbit-api"
  display_name = "Orbit API"
}

resource "google_sql_database_instance" "postgres" {
  name             = "orbit-postgres"
  database_version = "POSTGRES_17"
  region           = var.region

  settings {
    tier              = "db-custom-1-3840"
    availability_type = "ZONAL"
    disk_autoresize   = true
    disk_type         = "PD_SSD"
    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
    }
    ip_configuration {
      ipv4_enabled = false
    }
  }

  deletion_protection = true
}

resource "google_sql_database" "orbit" {
  name     = "orbit"
  instance = google_sql_database_instance.postgres.name
}

resource "google_secret_manager_secret" "database_url" {
  secret_id = "orbit-database-url"
  replication { auto {} }
}

resource "google_secret_manager_secret" "openai_api_key" {
  secret_id = "orbit-openai-api-key"
  replication { auto {} }
}

resource "google_secret_manager_secret_iam_member" "database_url" {
  secret_id = google_secret_manager_secret.database_url.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.api.email}"
}

resource "google_secret_manager_secret_iam_member" "openai_api_key" {
  secret_id = google_secret_manager_secret.openai_api_key.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.api.email}"
}

resource "google_project_iam_member" "cloud_sql" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.api.email}"
}

resource "google_cloud_run_v2_service" "api" {
  name     = "orbit-api"
  location = var.region

  template {
    service_account = google_service_account.api.email
    scaling {
      min_instance_count = 0
      max_instance_count = 10
    }
    containers {
      image = var.container_image
      ports { container_port = 8080 }
      resources {
        limits = { cpu = "1", memory = "512Mi" }
      }
      env { name = "ORBIT_ENV" value = "production" }
      env { name = "HTTP_ADDR" value = ":8080" }
      env { name = "OIDC_ISSUER_URL" value = var.oidc_issuer_url }
      env { name = "OIDC_AUDIENCE" value = var.oidc_audience }
      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref { secret = google_secret_manager_secret.database_url.secret_id version = "latest" }
        }
      }
      env {
        name = "OPENAI_API_KEY"
        value_source {
          secret_key_ref { secret = google_secret_manager_secret.openai_api_key.secret_id version = "latest" }
        }
      }
      volume_mounts { name = "cloudsql" mount_path = "/cloudsql" }
      startup_probe {
        failure_threshold = 10
        period_seconds    = 5
        timeout_seconds   = 3
        http_get { path = "/health/live" port = 8080 }
      }
    }
    volumes {
      name = "cloudsql"
      cloud_sql_instance { instances = [google_sql_database_instance.postgres.connection_name] }
    }
  }

  depends_on = [
    google_secret_manager_secret_iam_member.database_url,
    google_secret_manager_secret_iam_member.openai_api_key,
    google_project_iam_member.cloud_sql,
  ]
}

resource "google_cloud_run_v2_service_iam_member" "public_invoker" {
  count    = var.allow_public_invocation ? 1 : 0
  name     = google_cloud_run_v2_service.api.name
  location = google_cloud_run_v2_service.api.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

