# Contributing to Threads MCP Server

Thank you for considering contributing to Threads MCP Server! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone.

## How to Contribute

### Reporting Bugs

If you find a bug, please create an issue with:

- A clear, descriptive title
- Detailed steps to reproduce the issue
- Expected vs actual behavior
- Your environment (OS, Node version, etc.)
- Any relevant logs or error messages

### Suggesting Features

We welcome feature suggestions! Please create an issue with:

- A clear description of the feature
- Use cases and benefits
- Any implementation ideas you might have

### Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Make your changes** following our coding standards
3. **Add tests** for any new functionality
4. **Ensure all tests pass** with `pnpm test`
5. **Update documentation** as needed
6. **Commit your changes** using conventional commits
7. **Push to your fork** and submit a pull request

#### Pull Request Process

- Fill out the PR template completely
- Link any related issues
- Ensure CI passes
- Request review from maintainers
- Address any feedback promptly

## Development Setup

```bash
# Clone your fork
git clone https://github.com/your-username/threads-mcp.git
cd threads-mcp

# Install dependencies
pnpm install

# Create a branch for your work
git checkout -b feature/your-feature-name

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials
```

## Coding Standards

### TypeScript

- Use TypeScript for all code
- Enable strict type checking
- Avoid `any` types when possible
- Document complex types

### Code Style

- Follow the existing code style
- Use Prettier for formatting: `pnpm run format`
- Use ESLint for linting: `pnpm run lint`
- Use meaningful variable and function names

### Commits

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new feature
fix: resolve bug
docs: update documentation
test: add tests
refactor: improve code structure
chore: maintenance tasks
```

Examples:
```
feat: add support for video uploads
fix: resolve token validation error
docs: update API reference
test: add tests for thread creation
```

## Testing

### Writing Tests

- Use Vitest for all tests
- Maintain >90% code coverage
- Test both success and error cases
- Use descriptive test names
- Mock external dependencies

### Running Tests

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Watch mode
pnpm test:watch
```

### Test Structure

```typescript
describe('Feature', () => {
  describe('subfeature', () => {
    it('should do something specific', () => {
      // Arrange
      const input = 'test';

      // Act
      const result = doSomething(input);

      // Assert
      expect(result).toBe('expected');
    });
  });
});
```

## Documentation

- Update README.md for user-facing changes
- Add JSDoc comments for public APIs
- Include code examples where helpful
- Keep documentation clear and concise

## Project Structure

```
src/
├── client/          # API client implementation
├── server/          # MCP server implementation
├── types/           # Type definitions and schemas
└── index.ts         # Entry point

Each directory should have:
├── __tests__/       # Tests for the module
└── *.ts            # Implementation files
```

## Release Process

Maintainers will handle releases:

1. Update version in package.json
2. Update CHANGELOG.md
3. Create a git tag
4. Publish to npm
5. Create GitHub release

## Questions?

Feel free to:
- Open an issue for discussion
- Reach out to maintainers
- Check existing issues and PRs

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Thank You!

Your contributions help make this project better for everyone. We appreciate your time and effort! 🙏

