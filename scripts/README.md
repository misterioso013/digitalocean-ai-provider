# Scripts

This directory contains utility scripts for the digitalocean-ai-provider package.

## release.sh

Interactive release preparation script that:

1. **Pre-release checks**:
   - Runs type checking
   - Executes all tests
   - Builds the package
   - Validates the package

2. **Version management**:
   - Prompts for release type (patch/minor/major/custom)
   - Updates package.json version
   - Creates git commit and tag

3. **Publishing**:
   - Pushes to GitHub
   - Publishes to npm registry

### Usage

```bash
# Run the interactive release script
pnpm run release

# Or run directly
./scripts/release.sh
```

### Quick Release Commands

For simple releases, you can also use the direct npm scripts:

```bash
# Patch release (bug fixes)
pnpm run release:patch

# Minor release (new features)
pnpm run release:minor

# Major release (breaking changes)
pnpm run release:major
```

## Prerequisites

- Clean git working directory
- npm/pnpm authentication configured
- GitHub remote configured
- All tests passing
- TypeScript compilation successful
