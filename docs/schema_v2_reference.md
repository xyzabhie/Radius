# Radius Request Definition (.rd) - V2 Schema Reference

**Version:** 2.0  
**Status:** Stable  
**Last Updated:** February 2026

The Radius `.rd` format is a strict, YAML-based specification for describing HTTP requests. Version 2 (V2) introduces strong typing, array-based collections for execution fidelity, and explicit body configuration. This document serves as the authoritative reference for developers and automation tools interacting with `.rd` files.

---

## Table of Contents

1. [Overview](#1-overview)
2. [File Structure](#2-file-structure)
3. [Meta Section](#3-meta-section)
4. [Request Section](#4-request-section)
    - [Method & URL](#41-method--url)
    - [Headers & Parameters](#42-headers--parameters)
    - [Body Configuration](#43-body-configuration)
    - [Authentication](#44-authentication)
5. [Scripting & Runtime](#5-scripting--runtime)
6. [Best Practices](#6-best-practices)

---

## 1. Overview

Radius Request files (`.rd`) are designed to be human-readable, git-friendly, and machine-executable. Unlike proprietary binary formats, `.rd` files are plain text YAML, making them ideal for version control and code reviews.

### key Changes in V2
- **Strict Typing:** `body` configuration now requires a specific `type` discriminator.
- **Array Collections:** Headers and params are arrays, not maps, preserving order and duplicates.
- **Explicit State:** Support for `enabled: false` to disable items without deletion.

---

## 2. File Structure

A valid V2 `.rd` file consists of two top-level objects: `meta` and `request`. Optional sections include `auth` (if global) and `scripts`.

```yaml
meta:
  version: 2
  type: REST
  name: Create User
request:
  method: POST
  url: {{baseUrl}}/users
```

---

## 3. Meta Section

The `meta` object defines static properties used by the GUI and CLI for organization.

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `version` | `number` | **Yes** | - | Schema version. Must be `2` for this specification. |
| `type` | `string` | **Yes** | `REST` | Request type. Currently supports `REST` (future: `GraphQL`, `gRPC`). |
| `name` | `string` | No | Filename | Human-readable display name. |

---

## 4. Request Section

The `request` object defines the execution boundaries of the HTTP operation.

### 4.1. Method & URL

| Field | Type | Description |
|---|---|---|
| `method` | `string` | HTTP Verb (`GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `HEAD`, `OPTIONS`). Case-insensitive. |
| `url` | `string` | Fully qualified URL. Supports variable interpolation (e.g., `{{baseUrl}}`). |

### 4.2. Headers & Parameters

V2 uses **Arrays of Objects** for `headers` and `params`. This design choice ensures that:
1.  **Order is preserved** (critical for some signed API requests).
2.  **Duplicate keys are supported** (e.g., `Set-Cookie` or array-params like `id=1&id=2`).
3.  **Items can be toggled** via the `enabled` flag.

**Type Definition:**
```typescript
interface KeyValueEntry {
  key: string;        // Header/Param name
  value: string;      // Value (supports {{variables}})
  enabled?: boolean;  // Default: true. If false, item is ignored.
  description?: string; // Optional documentation
}
```

**Example:**
```yaml
headers:
  - key: Content-Type
    value: application/json
  - key: X-Experimental
    value: "true"
    enabled: false  # Disabled item
    description: "Temporary feature flag"
```

### 4.3. Body Configuration

The `body` object is strictly typed via the `type` field.

#### Content Types

| Type | Fields | Description |
|---|---|---|
| `json` | `text` | Raw JSON string. Editors should lint for JSON syntax. |
| `xml` | `text` | Raw XML string. |
| `html` | `text` | Raw HTML string. |
| `text` | `text` | Plain text content. |
| `form-data` | `form` | Multipart form data (Array of `KeyValueEntry`). |
| `urlencoded`| `form` | URL-encoded form data (Array of `KeyValueEntry`). |
| `graphql` | `graphql`| Object containing `query` and `variables`. |
| `none` | - | No body (default for GET). |

**Examples:**

**JSON:**
```yaml
body:
  type: json
  text: |
    {
      "sku": "ITEM-123",
      "quantity": 5
    }
```

**Multipart Form:**
```yaml
body:
  type: form-data
  form:
    - key: profile_pic
      value: (binary)
      description: "User avatar upload"
```

**GraphQL:**
```yaml
body:
  type: graphql
  graphql:
    query: |
      query GetUser($id: ID!) {
        user(id: $id) { name }
      }
    variables: |
      { "id": "123" }
```

### 4.4. Authentication

Authentication can be defined globally or inherently.

| Field | Type | Description |
|---|---|---|
| `type` | `string` | `none`, `bearer`, `basic`, `api-key`. |
| `token` | `string` | Required for `bearer`. |
| `username`| `string` | Required for `basic`. |
| `password`| `string` | Required for `basic`. |

```yaml
auth:
  type: bearer
  token: {{env.API_TOKEN}}
```

---

## 5. Scripting & Runtime

Radius includes a JavaScript runtime for advanced workflows.

### Lifecycle

1.  **Values Resolved**: `{{variables}}` in URL/Headers are interpolated.
2.  **Pre-Script (`scripts.pre`)**: Executed. Can modify variables or log data.
3.  **Request Execution**: HTTP request is sent.
4.  **Post-Script (`scripts.post`)**: Executed. Can assert response code, extract data, or chain variables.

### Global Object: `radius`

| Method | Description |
|---|---|
| `radius.getVariable(key)` | Retrieve a variable from the current scope. |
| `radius.setVariable(key, val)` | Set a variable for the **next** request (Session scope). |
| `radius.log(msg)` | Print to the console/logs. |
| `radius.expect(val)` | Start an assertion chain. |

### Response Object (Post-Script only)

Available as global `response` or `radius.response`.

- `response.status` (number)
- `response.headers` (object)
- `response.body` (string)
- `response.json()` (function, returns object)

**Assertion Example:**
```javascript
// Check status
radius.expect(response.status).toBe(200);

// Extract token for next request
const data = response.json();
radius.setVariable("authToken", data.token);
```

---

## 6. Best Practices

1.  **Use Variables for Base URLs**: Never hardcode environments. Use `{{baseUrl}}` and define it in your environment profiles (`environments/dev.rd`).
2.  **Commit Requests**: `.rd` files are code. Commit them to Git.
3.  **Mask Secrets**: Use `{{env.SECRET}}` for API keys and store the actual values in `.env` or the Environment Manager, never in the `.rd` file itself.
4.  **Descriptive Naming**: Use the `meta.name` field to provide clear, searchable names for your requests.
