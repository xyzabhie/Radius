# =============================================================================
# RADIUS ENVIRONMENT PROFILE TEMPLATE
# =============================================================================
# This file serves as a blueprint for creating environment-specific profiles.
# Copy this template and customize for your environment (local, staging, production).
#
# USAGE:
#   radius run requests/ --env <profile-name>
#
# VARIABLE RESOLUTION ORDER (highest to lowest priority):
#   1. Session Variables    - Set by previous requests via radius.setVariable()
#   2. Environment Profile  - Variables defined in this file (direct access)
#   3. .env / .env.local    - Loaded from dotenv files (access via {{env.VAR}})
#   4. System Environment   - OS environment variables (access via {{env.VAR}})
# =============================================================================

# -----------------------------------------------------------------------------
# PROFILE METADATA
# -----------------------------------------------------------------------------
# Human-readable name displayed in terminal output.
name: "Template Environment"

# -----------------------------------------------------------------------------
# VARIABLES
# -----------------------------------------------------------------------------
# Define environment-specific variables here.
# Access in requests using {{variableName}} syntax.
#
# GUIDELINES:
#   - Use camelCase for variable names
#   - All values must be strings (use quotes)
#   - Do NOT store real secrets here - use .env.local instead

variables:
  baseUrl: "http://localhost:3000"          # Base URL for API endpoints (required for most projects)
  apiVersion: "v1"                          # API version prefix
  timeout: "30000"                          # Request timeout in milliseconds
  logLevel: "debug"                         # Logging verbosity: debug | info | warn | error
  variableName: "value"                     # Add as many variables as you want as per your project requirements

# -----------------------------------------------------------------------------
# SECRETS (Output Masking in CLI) : OPTIONAL BUT RECOMMENDED
# -----------------------------------------------------------------------------
# Variable names listed here will have their VALUES masked in terminal output.
# This prevents accidental exposure when sharing logs or screenshots.
#
# NOTE: This only masks output - it does NOT secure the values.
#       For real secrets, use .env.local files which are git-ignored.
#
# EXAMPLE:
#   If apiKey is listed here under secrets and its value is "sk-abc123",
#   any terminal output containing "sk-abc123" will show "********" instead.
#
secrets: []
  # - apiKey
  # - authToken




