# Changelog

All notable changes to Radius will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-01

### Added

- **YAML Request Definitions**: Define API requests in `.rd` files with full schema validation
- **Variable Resolution**: Use `{{variable}}` syntax with support for environment files, `.env`, and built-in functions
- **Script Execution**: Pre-request and post-response JavaScript scripts with assertions
- **Environment Profiles**: Switch between environments with `--env` flag and secret masking
- **Request Chaining**: Variables persist across requests when running directories
- **Session Export**: Save session variables to JSON with `--save-vars`
- **CLI Interface**: `radius run` command for executing requests
- **Dynamic Variables**: `$uuid`, `$timestamp`, `$isodate`, `$randomInt`
- **Assertion Library**: Full assertion support with `.toBe()`, `.toEqual()`, `.toContain()`, etc.
- **Secret Masking**: Sensitive values masked with `********` in terminal output

### Technical

- Written in TypeScript with full type safety
- Uses Vitest for testing
- Headless architecture (CLI separate from core engine)
- Persistence via YAML `.rd` files (no local databases)

[1.0.0]: https://github.com/xyzabhie/Radius/releases/tag/v1.0.0
