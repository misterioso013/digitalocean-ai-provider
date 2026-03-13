# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-03-12

### Added
- Chat example (`examples/chat.ts`) — interactive multi-turn terminal chat using `streamText` and `ModelMessage`

### Changed
- **Breaking**: Upgraded to AI SDK Language Model **V3** specification (`@ai-sdk/provider@^3.0.8`, `@ai-sdk/provider-utils@^4.0.19`)
- Peer dependency updated to `ai@^6.0.0` (enables full `Output` API: `Output.object`, `Output.array`, `Output.choice`, `Output.json`, `elementStream`)
- `specificationVersion` changed from `'v2'` to `'v3'`
- `finishReason` now returns `{ unified, raw }` object instead of a plain string
- `usage` now uses nested structure `{ inputTokens: { total }, outputTokens: { total } }` instead of flat tokens
- `request.body` is now a raw object instead of a JSON string
- Streaming upgraded: added `stream-start`, `text-start`/`text-end`, `tool-input-end`, and `response-metadata` events
- `embeddingModel()` method added to provider (throws `NoSuchModelError`)
- Provider object now exposes `specificationVersion: 'v3'`
- Message converter updated for V3 tool call (`input: unknown`) and tool result (`output` typed union) shapes

## [0.1.0] - 2025-09-13

### Added
- Initial release of DigitalOcean AI Provider for Vercel AI SDK
- Support for DigitalOcean's Gradient AI Platform agents
- Full TypeScript support with comprehensive type definitions
- Text generation via `generateText()` API
- Multi-turn conversation support
- ESM and CommonJS module support
- Comprehensive error handling and type validation
- Support for both `.ondigitalocean.app` and `.agents.do-ai.run` domains
- Environment variable configuration for API keys
- Token usage tracking and statistics
- Example implementations and test suite

### Features
- Complete integration with DigitalOcean's AI Platform
- AI SDK V2 specification compliance
- Support for streaming responses (experimental)
- Customizable model settings and configurations
- Custom headers support
- Retrieval, functions, and guardrails metadata support
- Automatic endpoint validation
- Robust error handling with specific error types

### Documentation
- Comprehensive README with installation and usage guides
- Detailed API documentation with examples
- Contributing guidelines
- Security policy and vulnerability reporting
- Code of Conduct for community interaction
- Example code for common use cases
- TypeScript type definitions and JSDoc comments

### Development
- Complete test suite with unit and integration tests
- GitHub Actions for CI/CD
- Automated npm publishing workflow
- Type checking and linting configuration
- Build system using tsup for modern module formats
