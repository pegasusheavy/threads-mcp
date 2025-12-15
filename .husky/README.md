# Husky Git Hooks

This directory contains Git hooks managed by [Husky](https://typicode.github.io/husky/).

## Available Hooks

- **pre-commit**: Runs before creating a commit
  - Lint-staged (auto-fix staged files)
  - TypeScript type checking
- **pre-push**: Runs before pushing to remote
  - Full test suite
  - Coverage verification
  - Linting
  - Build verification
- **commit-msg**: Validates commit message format
  - Enforces conventional commits

## Documentation

See [../docs/GIT_HOOKS.md](../docs/GIT_HOOKS.md) for complete documentation.

## Quick Commands

```bash
# Bypass pre-commit (emergency only)
git commit --no-verify -m "your message"

# Bypass pre-push (emergency only)
git push --no-verify

# Test a hook manually
pnpm exec husky .husky/pre-commit
```

## Note

These hooks are automatically installed when you run `pnpm install`.
