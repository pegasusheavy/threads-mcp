# Git Hooks Documentation

This project uses [Husky](https://typicode.github.io/husky/) to enforce code quality standards through Git hooks.

## Overview

The following Git hooks are configured:

- **pre-commit**: Runs before creating a commit
- **pre-push**: Runs before pushing to remote
- **commit-msg**: Validates commit message format

## Pre-Commit Hook

Runs automatically when you execute `git commit`. This hook:

1. **Runs lint-staged** to:
   - Fix ESLint issues in staged `.ts` files
   - Format staged `.ts`, `.json`, and `.md` files with Prettier
   - Only processes files that are staged for commit

2. **Type checking**:
   - Runs TypeScript compiler to verify there are no type errors
   - Ensures code compiles successfully

If any of these checks fail, the commit will be blocked until you fix the issues.

## Pre-Push Hook

Runs automatically when you execute `git push`. This hook:

1. **Runs all unit tests**:
   - Executes `pnpm test` to run the entire test suite
   - Ensures no existing tests are broken

2. **Checks test coverage**:
   - Runs `pnpm run test:coverage`
   - Verifies coverage thresholds are met (90% for client code)

3. **Runs linter**:
   - Executes `pnpm run lint`
   - Ensures code follows project style guidelines

4. **Verifies build**:
   - Runs `pnpm run build`
   - Ensures the project compiles successfully

If any of these checks fail, the push will be blocked.

## Commit Message Hook

Runs automatically when you create a commit. This hook:

1. **Validates commit message format** using [Conventional Commits](https://www.conventionalcommits.org/)
2. **Enforces commit message structure**:

   ```
   <type>(<optional scope>): <subject>

   [optional body]

   [optional footer]
   ```

### Allowed Commit Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation only changes
- **style**: Changes that don't affect meaning (white-space, formatting, etc)
- **refactor**: Code change that neither fixes a bug nor adds a feature
- **perf**: Performance improvement
- **test**: Adding missing tests or correcting existing tests
- **build**: Changes that affect the build system or external dependencies
- **ci**: Changes to CI configuration files and scripts
- **chore**: Other changes that don't modify src or test files
- **revert**: Reverts a previous commit

### Valid Commit Examples

```bash
feat: add webhook retry mechanism
fix: resolve rate limiter token calculation bug
docs: update installation instructions for Claude
test: add unit tests for cache eviction
refactor: simplify thread client error handling
perf: optimize cache lookup performance
```

### Invalid Commit Examples

```bash
❌ Added new feature          # Missing type prefix
❌ FIX: bug in client         # Type must be lowercase
❌ feat:add cache             # Missing space after colon
❌ update: docs changed       # 'update' is not a valid type
```

## Bypassing Hooks (Not Recommended)

In rare cases where you need to bypass hooks:

```bash
# Skip pre-commit hook
git commit --no-verify -m "your message"

# Skip pre-push hook
git push --no-verify
```

**⚠️ Warning**: Bypassing hooks should only be done in exceptional circumstances, as it defeats the purpose of automated quality checks.

## Troubleshooting

### Hook not running

If hooks aren't running automatically:

1. Ensure Husky is installed:

   ```bash
   pnpm install
   ```

2. Reinitialize Husky:

   ```bash
   pnpm exec husky init
   ```

3. Verify hooks are executable:
   ```bash
   chmod +x .husky/*
   ```

### Pre-commit failing on type checking

If type checking fails during pre-commit:

1. Run `pnpm run build` manually to see the errors
2. Fix the TypeScript errors
3. Try committing again

### Pre-push taking too long

The pre-push hook runs the full test suite and build. To speed up development:

1. Run tests locally before pushing: `pnpm test`
2. Ensure tests pass before committing
3. Use `git push --no-verify` only if absolutely necessary

### Commit message validation failing

If your commit message is rejected:

1. Check that you're using one of the allowed types
2. Ensure the format is: `type: description`
3. Use lowercase for the type
4. Add a space after the colon

## Configuration Files

- **`.husky/`**: Contains the Git hook scripts
- **`commitlint.config.js`**: Commit message validation rules
- **`package.json`**: lint-staged configuration

## Modifying Hooks

To modify the hooks:

1. Edit the corresponding file in `.husky/`
2. Make it executable: `chmod +x .husky/<hook-name>`
3. Test the hook: `pnpm exec husky .husky/<hook-name>`

## Additional Resources

- [Husky Documentation](https://typicode.github.io/husky/)
- [lint-staged Documentation](https://github.com/okonet/lint-staged)
- [Commitlint Documentation](https://commitlint.js.org/)
- [Conventional Commits Specification](https://www.conventionalcommits.org/)
