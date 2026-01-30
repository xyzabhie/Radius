# Radius

A headless API request runner with YAML-based request definitions, environment management, and request chaining.

## Features

- **YAML Request Definitions**: Define API requests in `.rd` files with full schema validation
- **Variable Resolution**: Use `{{variable}}` syntax with support for environment files, `.env`, and built-in functions
- **Script Execution**: Pre-request and post-response JavaScript scripts with assertions
- **Environment Profiles**: Switch between environments (local, staging, production) with secret masking
- **Request Chaining**: Variables persist across requests in directory runs
- **Session Export**: Save session variables to JSON for debugging or CI integration

---

## Installation

```bash
# Clone and install dependencies
git clone <repository-url>
cd Radius
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
  url: "https://api.example.com/health"

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

Variables use the `{{variable}}` syntax and resolve in priority order:

| Priority | Source | Example |
|----------|--------|---------|
| 1 (highest) | Session (from previous requests) | `{{authToken}}` |
| 2 | Environment profile (`--env`) | `{{apiUrl}}` |
| 3 | `.env` / `.env.local` files | `{{env.API_KEY}}` |
| 4 (lowest) | System environment | `{{env.HOME}}` |

### Built-in Functions

| Function | Description | Example Output |
|----------|-------------|----------------|
| `{{$uuid}}` | UUID v4 | `550e8400-e29b-41d4-a716-446655440000` |
| `{{$timestamp}}` | Unix timestamp (ms) | `1706659200000` |
| `{{$isodate}}` | ISO 8601 date | `2024-01-31T00:00:00.000Z` |
| `{{$randomInt}}` | Random integer 0-999999 | `742851` |

---

## Environment Profiles

Create environment files in `environments/` directory:

### environments/local.rd

```yaml
name: "Local Development"

variables:
  apiUrl: "http://localhost:3000"
  apiKey: "dev-key-12345"

secrets:
  - apiKey   # Values listed here are masked in output
```

### Usage

```bash
# Use local environment
radius run requests/ --env local

# Use production environment
radius run requests/ --env production
```

Secret values are replaced with `********` in all terminal output.

---

## Request Chaining

When running a directory, variables set in one request persist to subsequent requests.

### Example: Login Flow

**01_login.rd**
```yaml
meta:
  name: "Login"
  type: REST
  version: 1

request:
  method: POST
  url: "{{apiUrl}}/auth/login"
  body:
    format: json
    content:
      username: "testuser"
      password: "{{password}}"

scripts:
  post: |
    const data = response.json();
    radius.setVariable("authToken", data.token);
    radius.log("Logged in, token saved");
```

**02_get_profile.rd**
```yaml
meta:
  name: "Get Profile"
  type: REST
  version: 1

request:
  method: GET
  url: "{{apiUrl}}/users/me"
  headers:
    Authorization: "Bearer {{authToken}}"

scripts:
  post: |
    radius.expect(response.status).toBe(200);
```

Run the chain:

```bash
radius run requests/auth-flow/
```

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

// Store values for chaining
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

# Run directory with chaining
radius run requests/auth-flow/

# With environment
radius run requests/ --env production

# Export session variables
radius run requests/ --save-vars session.json
```

---

## Project Structure

```
Radius/
├── src/
│   ├── cli/                    # CLI entry point and commands
│   │   ├── index.ts
│   │   ├── commands/run.ts
│   │   └── utils/formatter.ts
│   └── core/
│       ├── runner/             # Request execution engine
│       │   ├── RequestRunner.ts
│       │   ├── parser/YamlParser.ts
│       │   ├── resolver/VariableResolver.ts
│       │   ├── client/HttpClient.ts
│       │   └── sandbox/ScriptSandbox.ts
│       ├── environments/       # Environment management
│       │   └── EnvironmentManager.ts
│       └── session/            # Request chaining
│           └── SessionManager.ts
├── environments/               # Environment profiles
│   ├── local.rd
│   └── production.rd
├── requests/                   # Request definitions
│   └── examples/
├── schemas/                    # JSON schemas
│   └── request.schema.json
├── tests/                      # Test suites
│   ├── smoke/
│   └── chaining/
└── package.json
```

---

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Build the project
npm run build
```

---

## License

ISC
