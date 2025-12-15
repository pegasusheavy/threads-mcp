# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-12-15

### Added

- **Automatic OAuth 2.0 Authentication** - Server now handles OAuth flow automatically:
  - Opens browser window for user authorization
  - Exchanges authorization codes for tokens automatically
  - Stores and manages long-lived tokens securely in `.threads-token.json`
  - Automatic token refresh when tokens expire
  - OAuth callback server on port 48810 to avoid collisions
  - `OAuthServer` class for managing the authentication flow
  - `TokenManager` class for secure token storage and refresh
- **Advanced Features**:
  - Rate limiting with token bucket algorithm
  - In-memory caching layer with TTL and LRU eviction
  - Webhook support with HMAC-SHA256 signature verification
  - Event-driven architecture with automatic retries
- **Documentation**:
  - Comprehensive OAuth setup guide (`docs/OAUTH_SETUP.md`)
  - AI-specific documentation (`docs/ai.txt` and `docs/llms.txt`)
  - GitHub Pages website with Threads-themed UI
  - PWA manifest and app icons
  - Favicon and social media cards
  - Changelog page with dark mode support
- **Developer Experience**:
  - Husky pre-commit hooks with lint-staged
  - Commitlint for conventional commits
  - Comprehensive unit tests for OAuth flow (21 tests)
  - Tests for rate limiting, caching, and webhooks
  - `.npmignore` and `.gitignore` configurations

### Changed

- **Breaking**: Configuration now supports OAuth 2.0:
  - Use `THREADS_APP_ID` and `THREADS_APP_SECRET` instead of `THREADS_ACCESS_TOKEN` (recommended)
  - Legacy `THREADS_ACCESS_TOKEN` and `THREADS_USER_ID` still supported as fallback
- `ThreadsClient` now accepts `TokenManager` for dynamic token retrieval
- Package published as `@pegasusheavy/threads-mcp` with public access

### Fixed

- Corrected GitHub repository URLs from `PegasusHeavyIndustries` to `pegasusheavy`
- Fixed TypeScript errors in OAuth server related to unused variables
- Fixed Axios mocking in OAuth tests using `vi.mocked()`

## [1.0.0] - 2025-12-15

### Added

- Initial release of Threads MCP Server
- Complete Threads API v1.0 integration
- MCP protocol implementation with 8 powerful tools:
  - `threads_get_profile` - Get user profile information
  - `threads_get_threads` - List user's threads with pagination
  - `threads_get_thread` - Get specific thread details
  - `threads_create_thread` - Create new threads with text/image/video
  - `threads_get_insights` - Get analytics and metrics
  - `threads_get_replies` - Get replies to threads
  - `threads_get_conversation` - Get full conversation threads
  - `threads_reply_to_thread` - Reply to existing threads
- ThreadsClient class for direct API access
- Type-safe API with Zod schema validation
- Comprehensive error handling with ThreadsAPIError
- Full TypeScript support
- > 90% test coverage with Vitest
- Detailed documentation and examples
- MIT License

### Technical Details

- Built with @modelcontextprotocol/sdk v1.0.4
- Uses axios v1.7.9 for HTTP requests
- Zod v3.24.1 for runtime type validation
- TypeScript 5.7.2
- Node.js 18+ required
- pnpm package manager

### Development

- ESLint configuration for code quality
- Prettier configuration for code formatting
- Vitest for testing with coverage reporting
- GitHub Actions CI/CD ready (to be configured)
- Conventional commits structure

[1.1.0]: https://github.com/pegasusheavy/threads-mcp/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/pegasusheavy/threads-mcp/releases/tag/v1.0.0
