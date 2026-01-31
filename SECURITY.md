# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## Reporting a Vulnerability

We take security seriously at Radius. If you discover a security vulnerability, please follow these steps:

### 1. Do NOT Open a Public Issue

Security vulnerabilities should not be disclosed publicly until a fix is available.

### 2. Report Privately

Send an email to **xyz.abhie@gmail.com** with:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fixes (optional)

### 3. Response Timeline

- **Initial response**: Within 48 hours
- **Status update**: Within 7 days
- **Fix release**: Depends on severity (critical: ASAP, high: within 2 weeks)

## Security Considerations

### Environment Files

Radius uses `.env` files which may contain sensitive data:

- **Never commit** `.env.local` or files containing real credentials
- Use the `secrets` array in environment profiles to mask sensitive output
- The `.gitignore` is pre-configured to exclude common secret file patterns

### Request Files (.rd)

- Avoid hardcoding credentials in `.rd` files
- Use environment variables: `{{env.API_KEY}}`
- Reference secrets from environment profiles

### Session Data

- Session files may contain tokens from API responses
- The `session.json` pattern is gitignored by default
- Be cautious when sharing session exports

## Best Practices

1. **Use environment profiles** for different stages (dev/staging/prod)
2. **Mark secrets in environment files** so they're masked in output
3. **Review `.rd` files** before committing to ensure no credentials
4. **Use `.env.local`** for machine-specific secrets (gitignored by default)

---

Thank you for helping keep Radius secure!
