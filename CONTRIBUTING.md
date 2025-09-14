# Contributing to DigitalOcean AI Provider

Thank you for your interest in contributing to the DigitalOcean AI Provider! We welcome contributions from the community.

## 🚀 Quick Start

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/your-username/digitalocean-ai-provider.git
   cd digitalocean-ai-provider
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Run the development environment**:
   ```bash
   npm run dev
   ```

## 🛠️ Development Setup

### Prerequisites
- Node.js 18 or higher
- npm or pnpm
- A DigitalOcean account with AI agents (for testing)

### Environment Setup
1. Create a `.env` file based on `.env.example`
2. Add your DigitalOcean AI API key and agent URL
3. Run tests to verify setup: `npm test`

### Project Structure
```
src/
├── index.ts                      # Main exports
├── digitalocean-provider.ts      # Provider factory
├── digitalocean-language-model.ts # Core implementation
├── digitalocean-types.ts         # Type definitions
├── digitalocean-settings.ts      # Configuration types
├── digitalocean-error.ts         # Error handling
└── message-converter.ts          # Message format conversion
```

## 📝 Making Changes

### Before You Start
- Check existing issues to see if your idea is already being worked on
- For significant changes, open an issue to discuss the approach
- Keep changes focused and atomic

### Development Workflow
1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following our coding standards

3. **Test your changes**:
   ```bash
   npm run test        # Run unit tests
   npm run type-check  # Check TypeScript types
   npm run build       # Build the package
   ```

4. **Test with real DigitalOcean agents**:
   ```bash
   npm run test:real   # Test with actual API
   ```

5. **Commit your changes** using conventional commits:
   ```bash
   git commit -m "feat: add streaming support for conversations"
   git commit -m "fix: handle missing finish_reason in API response"
   git commit -m "docs: update README with new examples"
   ```

### Coding Standards

#### TypeScript
- Use strict TypeScript configuration
- Export types for public APIs
- Add JSDoc comments for public methods
- Follow existing patterns for error handling

#### Code Style
- Use Prettier for formatting (configured in the project)
- Follow existing naming conventions
- Keep functions focused and small
- Add comments for complex logic

#### Testing
- Add unit tests for new functionality
- Test error conditions and edge cases
- Include integration tests for API interactions
- Maintain test coverage above 80%

## 🧪 Testing

### Unit Tests
```bash
npm test                # Run all tests
npm run test:watch      # Run tests in watch mode
```

### Integration Tests
```bash
npm run test:integration
```

### Manual Testing
```bash
npm run test:real       # Test with real DigitalOcean agents
```

## 📚 Documentation

### README Updates
- Update examples if you change the API
- Add new features to the feature list
- Update installation instructions if needed

### Code Documentation
- Add JSDoc comments for public APIs
- Include usage examples in comments
- Document any breaking changes

### Examples
- Update examples in the `examples/` directory
- Ensure examples work with the latest changes
- Add new examples for new features

## 🚀 Pull Request Process

### Before Submitting
- [ ] Tests pass (`npm test`)
- [ ] Type checking passes (`npm run type-check`)
- [ ] Build succeeds (`npm run build`)
- [ ] Manual testing completed
- [ ] Documentation updated
- [ ] Changelog entry added (if applicable)

### Pull Request Guidelines
1. **Use the PR template** - Fill out all relevant sections
2. **Keep PRs focused** - One feature/fix per PR
3. **Write clear titles** - Use conventional commit format
4. **Add screenshots** - If the change affects behavior
5. **Link related issues** - Use "Fixes #123" or "Closes #123"

### Review Process
- Maintainers will review your PR within 3-5 business days
- Address feedback promptly
- Keep your branch up to date with main
- Be responsive to questions and suggestions

## 🐛 Reporting Issues

### Bug Reports
Use the bug report template and include:
- Clear reproduction steps
- Expected vs actual behavior
- Environment information
- Minimal code example
- Error messages/logs

### Feature Requests
Use the feature request template and include:
- Clear use case description
- Proposed API design
- Benefits to the community
- Implementation ideas (optional)

## 📋 Code of Conduct

### Our Standards
- Use welcoming and inclusive language
- Be respectful of differing viewpoints
- Accept constructive criticism gracefully
- Focus on what's best for the community
- Show empathy towards other community members

### Unacceptable Behavior
- Harassment or discriminatory language
- Personal attacks or trolling
- Public or private harassment
- Publishing others' private information
- Other conduct inappropriate in a professional setting

## 🏆 Recognition

Contributors will be:
- Listed in the README contributors section
- Mentioned in release notes for significant contributions
- Eligible for GitHub sponsor recognition

## 📞 Getting Help

### Questions
- Open a GitHub issue with the "question" label
- Check existing discussions and issues first
- Provide context and relevant code examples

### Real-time Help
- GitHub Discussions for longer conversations
- Issues for specific bugs or feature requests

## 📄 License

By contributing to this project, you agree that your contributions will be licensed under the MIT License.

## 🙏 Thank You

Every contribution, no matter how small, helps make this project better. Thank you for taking the time to contribute!
