output "api_url" {
  value = google_cloud_run_v2_service.api.uri
}

output "cloud_sql_connection_name" {
  value = google_sql_database_instance.postgres.connection_name
}

output "database_url_secret" {
  value = google_secret_manager_secret.database_url.secret_id
}

