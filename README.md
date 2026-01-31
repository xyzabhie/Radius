# Radius

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)

A headless API request runner with YAML-based request definitions, environment management, and request chaining.

## Table of Contents

- [Why Radius?](#why-radius)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Request File Schema](#request-file-schema-rd)
- [Variable Resolution](#variable-resolution)
- [Environment Profiles](#environment-profiles)
- [Request Chaining](#request-chaining)
- [More Examples](#more-examples)
- [Script API](#script-api)
- [CLI Reference](#cli-reference)
- [Project Structure](#project-structure)
- [Testing](#testing)
- [Contributing](#contributing)
- [Changelog](#changelog)
- [Security](#security)
- [License](#license)

---

## Why Radius?

Radius is an Engine-First API orchestrator designed for high-precision workflows where GUIs often fail.
- **CLI-first**: Designed for terminal and CI/CD pipelines experiences
- **Git-friendly**: All requests are plain YAML files that diff and merge cleanly
- **Headless**: GUI is optional - runs entirely in terminal (GUI coming in the future releases)
- **Scriptable**: JavaScript pre/post hooks with a full assertion library
- **Lightweight**: Single CLI tool with minimal dependencies
- **Team-ready**: Share request collections via version control

---

## Features

- **YAML Request Definitions**: Define API requests in `.rd` files with full schema validation
- **Variable Resolution**: Use `{{variable}}` syntax with support for environment files, `.env`, and dynamic variables
- **Script Execution**: Pre-request and post-response JavaScript scripts with assertions
- **Environment Profiles**: Switch between environments (local, staging, production) with secret masking
- **Request Chaining**: Variables persist across requests in directory runs via the SessionManager
- **Session Export**: Save session variables to JSON for debugging or CI integration

---

## Prerequisites

Before installing Radius, ensure you have:

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **OS**: Windows, macOS, or Linux

---

## Installation

```bash
# Clone the repository
git clone https://github.com/xyzabhie/Radius.git
cd Radius

# Install dependencies
npm install

# Build the project
npm run build

# Link globally for system-wide access
npm link
```

After linking, the `radius` command is available globally:

```bash
radius --help
```

---

## Quick Start

### 1. Create a Request File

Create `requests/health.rd`:

```yaml
meta:
  name: "Health Check"
  type: REST
  version: 1

request:
  method: GET
  url: "https://httpbin.org/get"

scripts:
  post: |
    radius.expect(response.status).toBe(200);
    radius.log("Health check passed");
```

### 2. Run the Request

```bash
radius run requests/health.rd
```

---

## Request File Schema (.rd)

```yaml
meta:
  name: string          # Request name (required)
  type: REST | GraphQL  # Request type (required)
  version: number       # Schema version (required)

request:
  method: GET | POST | PUT | PATCH | DELETE | HEAD | OPTIONS
  url: string           # URL with variable support: "{{baseUrl}}/users"
  headers:              # Optional headers
    Content-Type: "application/json"
    Authorization: "Bearer {{authToken}}"
  body:                 # Optional request body
    format: json | form | graphql | raw
    content: object | string

auth:                   # Optional authentication
  type: none | bearer | basic | api-key
  token: string         # For bearer auth
  username: string      # For basic auth
  password: string      # For basic auth
  key: string           # For api-key auth
  value: string         # For api-key auth
  in: header | query    # For api-key auth

scripts:
  pre: string           # JavaScript executed before request
  post: string          # JavaScript executed after response
```

---

## Variable Resolution

Variables use the `{{variable}}` syntax and resolve according to a 4-tier priority system managed by the engine.

### Priority and Namespace Rules

| Priority | Source | Namespace | Access Pattern | Managed By |
|----------|--------|-----------|----------------|------------|
| 1 (highest) | Session (from previous requests) | Direct | `{{authToken}}` | SessionManager |
| 2 | Environment profile (`--env`) | Direct | `{{apiUrl}}` | EnvironmentManager |
| 3 | `.env` / `.env.local` files | `env.` prefix required | `{{env.API_KEY}}` | EnvironmentManager |
| 4 (lowest) | System environment | `env.` prefix required | `{{env.HOME}}` | EnvironmentManager |

**Namespace Rule**: Variables from Session and Environment Profiles are accessed directly. Variables from `.env` files and System environment must use the `env.` prefix.

In the Request Chaining example below, `{{authToken}}` is resolved from the active Session, which holds the highest priority in the resolution hierarchy.

### Dynamic Variables

These variables are auto-generated by the engine at runtime and are available in every request scope.

| Variable | Description | Example Output |
|----------|-------------|----------------|
| `{{$uuid}}` | UUID v4 | `550e8400-e29b-41d4-a716-446655440000` |
| `{{$timestamp}}` | Unix timestamp (ms) | `1706659200000` |
| `{{$isodate}}` | ISO 8601 date | `2024-01-31T00:00:00.000Z` |
| `{{$randomInt}}` | Random integer 0-999999 | `742851` |

---

## Environment Profiles

Create environment files in `environments/` directory. All variables must be defined in the `variables:` block.

### environments/httpbin.rd (Local Development Environment)

```yaml
# HTTPBIN PUBLIC API ENVIRONMENT For Local Development Testing

name: "HTTPBin Public API"

variables:
  baseUrl: "https://httpbin.org"        # Public testing service for examples

# No secrets needed for public API
secrets: []
```

See `environments/_template.rd` in the repo for a comprehensive blueprint with all available options.

### Usage

```bash
# Run examples with httpbin environment
radius run requests/examples/auth-flow/ --env httpbin

# Run with custom environment
radius run requests/ --env [your_environment_name]
```

Secret values are replaced with `********` in all terminal output by the EnvironmentManager.

---

## Request Chaining

When running a directory, variables set in one request persist to subsequent requests via the SessionManager. This section demonstrates a complete login flow using environment-driven configuration.

### How It Works

1. **Environment Profile** provides `{{baseUrl}}` (Priority 2 - from EnvironmentManager)
2. **First Request** executes and calls `radius.setVariable("authToken", ...)` in post-script
3. **SessionManager** stores `authToken` as a Session variable (Priority 1)
4. **Second Request** resolves `{{authToken}}` from Session (highest priority)

### Step 1: Environment Setup

Create `environments/httpbin.rd` to define the target API:

```yaml
name: "HTTPBin Public API"

variables:
  baseUrl: "https://httpbin.org"

secrets: []
```

### Step 2: Request Files

The following executable examples are located in `requests/examples/auth-flow/`.

**requests/examples/auth-flow/01_login.rd**
```yaml
meta:
  name: "Auth Flow - Login API Example"
  type: REST
  version: 1

request:
  method: POST
  url: "{{baseUrl}}/post"
  headers:
    Content-Type: "application/json"
  body:
    format: json
    content:
      username: "testuser"
      password: "password123"

scripts:
  post: |
    const data = response.json();
    // Simulate receiving a token from the login API response
    radius.setVariable("authToken", "simulated-token-12345");
    radius.log("Login simulation complete, authToken injected into session");
    radius.expect(response.status).toBe(200);
```

**requests/examples/auth-flow/02_get_profile.rd**
```yaml
meta:
  name: "Auth Flow - Get Profile Example"
  type: REST
  version: 1

request:
  method: GET
  url: "{{baseUrl}}/get"
  headers:
    Authorization: "Bearer {{authToken}}"

scripts:
  post: |
    const data = response.json();
    radius.log("Profile request completed with Authorization header");
    radius.expect(response.status).toBe(200);
    radius.expect(data.headers.Authorization).toBe("Bearer simulated-token-12345");
```

### Step 3: Execute the Chain

```bash
radius run requests/examples/auth-flow/ --env httpbin
```

### Variable Resolution Flow

| Request | Variable | Source | Priority |
|---------|----------|--------|----------|
| 01_login.rd | `{{baseUrl}}` | Environment Profile (httpbin.rd) | 2 |
| 02_get_profile.rd | `{{baseUrl}}` | Environment Profile (httpbin.rd) | 2 |
| 02_get_profile.rd | `{{authToken}}` | Session (set by 01_login.rd) | 1 (highest) |

The SessionManager persists `authToken` from the first request, making it available for variable resolution in the second request. This enables authentication flows, data extraction, and multi-step API workflows.

---

## More Examples

The `requests/examples/` directory contains additional examples demonstrating various Radius features.

### REST API with Authentication

**`requests/examples/create_user.rd`** - POST request with bearer authentication and scripting:

```yaml
meta:
  name: "Create User"
  type: REST
  version: 1

request:
  method: POST
  url: "{{baseUrl}}/api/v1/users"
  headers:
    Content-Type: "application/json"
    X-Request-ID: "{{$uuid}}"
  body:
    format: json
    content:
      username: "johndoe"
      email: "john.doe@example.com"

auth:
  type: bearer
  token: "{{env.ACCESS_TOKEN}}"

scripts:
  post: |
    if (response.status === 201) {
      radius.setVariable("createdUserId", response.json().id);
    }
```

**Key Features:**
- Bearer token authentication via `{{env.ACCESS_TOKEN}}`
- Dynamic request ID with `{{$uuid}}`
- Session variable injection for request chaining

### GraphQL Query

**`requests/examples/get_users_gql.rd`** - GraphQL query with variables:

```yaml
meta:
  name: "Get Users (GraphQL)"
  type: GraphQL
  version: 1

request:
  method: POST
  url: "{{baseUrl}}/graphql"
  headers:
    Content-Type: "application/json"
  body:
    format: graphql
    query: |
      query GetUsers($limit: Int!, $offset: Int) {
        users(limit: $limit, offset: $offset) {
          id
          username
          email
        }
      }
    variables:
      limit: 10
      offset: 0

auth:
  type: bearer
  token: "{{env.GQL_TOKEN}}"
```

**Key Features:**
- GraphQL request type with query and variables
- Structured response handling
- Bearer authentication for protected endpoints

> **Note:** These examples require a compatible API server. For immediate testing, use the `auth-flow/` examples with `--env httpbin`.

---

## Script API

### Pre-Request Scripts

Access to `radius` object only (no response available yet).

```javascript
// Set variables for the request
radius.setVariable("requestId", radius.uuid());
radius.log("Request ID:", radius.getVariable("requestId"));
```

### Post-Response Scripts

Access to both `radius` and `response` objects.

```javascript
// Parse response
const data = response.json();

// Store values for chaining via SessionManager
radius.setVariable("userId", data.id);

// Assertions
radius.expect(response.status).toBe(200);
radius.expect(data.email).toBeDefined();
radius.expect(data.age).toBeGreaterThan(18);

// Logging
radius.log("User created:", data.id);
```

### Assertion Methods

| Method | Description |
|--------|-------------|
| `.toBe(value)` | Strict equality |
| `.toEqual(value)` | Deep equality |
| `.toBeDefined()` | Not undefined |
| `.toBeNull()` | Is null |
| `.toBeTruthy()` | Truthy value |
| `.toBeFalsy()` | Falsy value |
| `.toBeGreaterThan(n)` | Greater than |
| `.toBeLessThan(n)` | Less than |
| `.toContain(value)` | Array/string contains |
| `.toMatch(regex)` | Regex match |

---

## CLI Reference

```
Usage: radius [options] [command]

API request runner for .rd files

Options:
  -V, --version              output version number
  -h, --help                 display help

Commands:
  run <path> [options]       Execute a .rd file or directory
    -e, --env <name>         Environment file from environments/
    -v, --verbose            Show detailed output
    -s, --save-vars <file>   Save session variables to JSON
  help [command]             Display help for command
```

### Examples

```bash
# Run single request
radius run requests/health.rd

# Run directory with chaining (requires environment)
radius run requests/examples/auth-flow/ --env httpbin

# With custom environment
radius run requests/ --env production

# Export session variables
radius run requests/ --save-vars session.json
```

---

## Project Structure

```
Radius/
├── src/
│   ├── cli/                        # CLI entry point and commands
│   │   ├── index.ts
│   │   ├── commands/run.ts
│   │   └── utils/formatter.ts
│   └── core/                       # Headless execution engine
│       ├── runner/                 # Request execution
│       │   ├── RequestRunner.ts
│       │   ├── parser/YamlParser.ts
│       │   ├── resolver/VariableResolver.ts
│       │   ├── client/HttpClient.ts
│       │   └── sandbox/ScriptSandbox.ts
│       ├── environment/            # Environment profile logic (singular)
│       │   └── EnvironmentManager.ts
│       └── session/                # Request chaining state
│           └── SessionManager.ts
├── environments/                   # Environment profile data (plural)
│   ├── _template.rd                # Blueprint for creating profiles
│   └── httpbin.rd                  # Public API for examples
├── requests/                       # Request definitions
│   └── examples/
│       └── auth-flow/              # Executable chaining example
│           ├── 01_login.rd
│           └── 02_get_profile.rd
├── schemas/                        # JSON schemas
│   └── request.schema.json
├── tests/                          # Test fixtures
│   ├── smoke/                      # Basic connectivity tests
│   └── chaining/                   # Variable chaining tests
└── package.json
```

**Naming Convention**: The `src/core/environment/` directory contains the logic module (singular), while `environments/` at the root contains data files (plural).

---

## Testing

```bash
# Run unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Build the project
npm run build

# Run executable examples manually
radius run requests/examples/auth-flow/
radius run tests/chaining/
radius run tests/smoke/
```

---

## Contributing

We welcome contributions. Please read our [Contributing Guide](CONTRIBUTING.md) before submitting a PR.

### AI-Assisted Contributions

This project is optimized for AI-assisted development (e.g., Cursor, Windsurf). Agents must respect the project's "No-Emoji" standard and maintain strict decoupling between the `src/core` engine and the `src/cli` interface.

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for release history.

---

## Security

For security concerns, please review our [Security Policy](SECURITY.md).

---

## License

[MIT](LICENSE)
