resource "aws_cognito_user_pool" "mortgage" {
  name                     = "mortgage-users"
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]
  mfa_configuration        = "OFF"

  username_configuration {
    case_sensitive = false
  }

  password_policy {
    minimum_length                   = 12
    require_lowercase                = true
    require_numbers                  = true
    require_symbols                  = true
    require_uppercase                = true
    temporary_password_validity_days = 7
  }

  admin_create_user_config {
    allow_admin_create_user_only = false
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  user_attribute_update_settings {
    attributes_require_verification_before_update = ["email"]
  }

  tags = {
    Application = "mortgage-calculator"
  }
}

resource "aws_cognito_user_pool_client" "mortgage" {
  name                          = "mortgage-web"
  user_pool_id                  = aws_cognito_user_pool.mortgage.id
  generate_secret               = false
  explicit_auth_flows           = ["ALLOW_USER_SRP_AUTH", "ALLOW_REFRESH_TOKEN_AUTH"]
  prevent_user_existence_errors = "ENABLED"
  enable_token_revocation       = true
  access_token_validity         = 60
  id_token_validity             = 60
  refresh_token_validity        = 30
  auth_session_validity         = 3

  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }
}

output "mortgage_cognito_region" {
  value = data.aws_region.current.name
}

output "mortgage_cognito_user_pool_id" {
  value = aws_cognito_user_pool.mortgage.id
}

output "mortgage_cognito_user_pool_client_id" {
  value = aws_cognito_user_pool_client.mortgage.id
}
