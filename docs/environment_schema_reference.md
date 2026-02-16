# Radius Environment Profile (.rd) - Schema Reference

**Status:** Stable  
**Last Updated:** February 2026

The Radius Environment Profile format (`.rd` files in `environments/`) defines configuration sets for different execution contexts (e.g., `local`, `staging`, `production`). These profiles allow developers to switch contexts instantly without modifying their request files.

---

## Table of Contents

1.  [Overview](#1-overview)
2.  [File Location & Naming](#2-file-location--naming)
3.  [Schema Structure](#3-schema-structure)
    -   [Metadata](#31-metadata)
    -   [Variables](#32-variables)
    -   [Secrets Configuration](#33-secrets-configuration)
4.  [Variable Resolution Hierarchy](#4-variable-resolution-hierarchy)
5.  [Security & Best Practices](#5-security--best-practices)

---

## 1. Overview

Environment Profiles map abstract variable names (e.g., `{{baseUrl}}`) to concrete values (e.g., `https://api.staging.com`). This decoupling allows the same Request Definition to run against any environment.

### key Features
- **YAML-Based**: Simple, readable configuration.
- **Hot-Swappable**: Switch environments via CLI flags or GUI selectors.
- **Secret Masking**: Automatically redact sensitive values in logs and terminal output.

---

## 2. File Location & Naming

- **Location**: All profiles must represent a single `.rd` file located in the `environments/` directory at the project root.
- **Naming**: The filename (without extension) is treated as the **Profile ID** by the CLI.
    -   `environments/local.rd` -> ID: `local`
    -   `environments/prod.rd` -> ID: `prod`

**CLI Usage:**
```bash
radius run requests/ --env local
```

---

## 3. Schema Structure

A valid profile consists of three sections: `name`, `variables`, and `secrets`.

```yaml
# environments/staging.rd

name: "Staging Environment"

variables:
  baseUrl: "https://api.staging.example.com"
  apiVersion: "v2"
  timeout: "5000"

secrets:
  - apiKey
  - dbPassword
```

### 3.1. Metadata

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | **Yes** | Human-readable display name used in GUIs and logs. |

### 3.2. Variables

The `variables` object defines key-value pairs available to requests.

- **Keys**: Must be valid variable names (camelCase recommended).
- **Values**: Must be strings. Numbers or booleans should be quoted.

**Usage in Requests:**
If you define `baseUrl: "https://api.com"`, you can use it in a request as `{{baseUrl}}`.

### 3.3. Secrets Configuration

The `secrets` array lists variable names that contain sensitive data.

| Field | Type | Description |
|---|---|---|
| `secrets` | `string[]` | List of variable names to mask. |

**Behavior:**
- **Masking**: Any value belonging to a variable listed here will be replaced with `********` in CLI output, logs, and error messages.
- **Inheritance**: This applies to values defined in this file OR values loaded from `.env` files.

---

## 4. Variable Resolution Hierarchy

When a request executes, Radius resolves variables in this order (highest priority first):

1.  **Session Variables**: Values set programmatically by scripts (`radius.setVariable()`).
2.  **Environment Profile**: Variables defined in the currently active `.rd` file.
3.  **Local Environment (`.env`)**: Variables from `.env` or `.env.local` (accessed via `{{env.VAR}}`).
4.  **System Environment**: OS-level environment variables (accessed via `{{env.VAR}}`).

---

## 5. Security & Best Practices

1.  **Do NOT Commit Real Secrets**:
    -   **Bad**: Putting actual API keys in `variables` and committing the file.
    -   **Good**: Leaving the variable empty or using a placeholder, and using `.env.local` for the actual secret.

2.  **Use `.env` for Secrets**:
    Radius integrates with `dotenv`. Store actual secrets in `.env.local` (git-ignored) and access them in your requests/scripts as `{{env.API_KEY}}`.
    
    *However*, if you want `{{apiKey}}` to resolve differently per environment, you can define it in `environments/local.rd` pointing to a dev key, and `environments/prod.rd` pointing to a prod key, provided you **do not commit** the prod file with the real key.

3.  **Always Mask Sensitive Data**:
    Add any sensitive variable names to the `secrets` list. This ensures that even if a script logs the value, it gets redacted.

    ```yaml
    variables:
      adminToken: "sensitive-value"
    
    secrets:
      - adminToken
    ```
