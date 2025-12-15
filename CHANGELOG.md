# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
- >90% test coverage with Vitest
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

[1.0.0]: https://github.com/PegasusHeavyIndustries/threads-mcp/releases/tag/v1.0.0

