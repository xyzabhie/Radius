# Contributing to Radius

Thank you for your interest in contributing to Radius! This document provides guidelines for contributing to the project.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/xyzabhie/Radius.git
   cd Radius
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Create a branch** for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Workflow

### Building

```bash
npm run build
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

### Code Style

- Use TypeScript for all source files
- Follow existing code patterns and naming conventions
- Write meaningful commit messages following [Conventional Commits](https://www.conventionalcommits.org/)

## Pull Request Process

1. **Ensure tests pass**: Run `npm test` before submitting
2. **Update documentation**: If you change functionality, update the README
3. **Write clear PR descriptions**: Explain what changes you made and why
4. **Reference issues**: Link any related issues in your PR

### PR Title Format

Use Conventional Commits format:
- `feat: add new assertion method`
- `fix: resolve variable resolution bug`
- `docs: update installation instructions`
- `test: add tests for HttpClient`

## Reporting Issues

When reporting issues, please include:

- **Description**: Clear description of the problem
- **Steps to reproduce**: Minimal steps to reproduce the issue
- **Expected behavior**: What you expected to happen
- **Actual behavior**: What actually happened
- **Environment**: Node.js version, OS, Radius version

## Feature Requests

We welcome feature requests! Please:

1. Check existing issues to avoid duplicates
2. Describe the use case and expected behavior
3. Explain why this feature would be valuable

## Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## Questions?

Open a [Discussion](https://github.com/xyzabhie/Radius/discussions) for questions or ideas.

---

Thank you for contributing to Radius!
