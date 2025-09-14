#!/bin/bash

# Release preparation script for digitalocean-ai-provider
set -e

echo "🚀 Starting release preparation for digitalocean-ai-provider..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root."
    exit 1
fi

# Check if git is clean
if [ -n "$(git status --porcelain)" ]; then
    print_warning "Working directory is not clean. Please commit or stash changes before release."
    echo "Uncommitted changes:"
    git status --short
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
print_status "Current version: $CURRENT_VERSION"

# Ask for release type
echo
echo "Select release type:"
echo "1) Patch (bug fixes)"
echo "2) Minor (new features, backward compatible)"  
echo "3) Major (breaking changes)"
echo "4) Custom version"
echo

read -p "Enter choice (1-4): " -n 1 -r
echo

case $REPLY in
    1)
        RELEASE_TYPE="patch"
        ;;
    2)
        RELEASE_TYPE="minor"
        ;;
    3)
        RELEASE_TYPE="major"
        ;;
    4)
        read -p "Enter custom version (e.g., 1.2.3): " CUSTOM_VERSION
        if [[ ! $CUSTOM_VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
            print_error "Invalid version format. Please use semantic versioning (x.y.z)"
            exit 1
        fi
        ;;
    *)
        print_error "Invalid choice"
        exit 1
        ;;
esac

# Run pre-release checks
print_status "Running pre-release checks..."

print_status "1. Type checking..."
if ! pnpm run type-check; then
    print_error "Type check failed"
    exit 1
fi
print_success "Type check passed"

print_status "2. Running tests..."
if ! pnpm test; then
    print_error "Tests failed"
    exit 1
fi
print_success "All tests passed"

print_status "3. Building package..."
if ! pnpm run build:clean; then
    print_error "Build failed"
    exit 1
fi
print_success "Build completed"

print_status "4. Validating package..."
if ! pnpm run validate; then
    print_error "Package validation failed"
    exit 1
fi
print_success "Package validation passed"

# Version bump
print_status "Updating version..."
if [ "$REPLY" == "4" ]; then
    # Custom version
    npm version $CUSTOM_VERSION --no-git-tag-version
    NEW_VERSION=$CUSTOM_VERSION
else
    # Semantic version bump
    NEW_VERSION=$(npm version $RELEASE_TYPE --no-git-tag-version | sed 's/v//')
fi

print_success "Version updated to $NEW_VERSION"

# Update CHANGELOG if it exists
if [ -f "CHANGELOG.md" ]; then
    print_status "Please update CHANGELOG.md with the changes for version $NEW_VERSION"
    read -p "Press Enter to continue after updating CHANGELOG.md..."
fi

# Git operations
print_status "Creating git commit and tag..."
git add .
git commit -m "chore: release v$NEW_VERSION"
git tag "v$NEW_VERSION"

print_success "Git commit and tag created"

# Final confirmation
echo
print_warning "Ready to publish version $NEW_VERSION"
echo "This will:"
echo "  - Push commits and tags to GitHub"
echo "  - Publish package to npm registry"
echo

read -p "Continue with publishing? (y/N): " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Release cancelled. Version has been updated but not published."
    print_status "To publish later, run: npm publish"
    exit 0
fi

# Push to GitHub
print_status "Pushing to GitHub..."
git push origin main
git push origin "v$NEW_VERSION"
print_success "Pushed to GitHub"

# Publish to npm
print_status "Publishing to npm..."
if npm publish; then
    print_success "Package published successfully!"
    echo
    print_success "🎉 Release v$NEW_VERSION completed!"
    echo
    echo "Next steps:"
    echo "  - Check npm: https://www.npmjs.com/package/digitalocean-ai-provider"
    echo "  - Create GitHub release: https://github.com/YOUR_USERNAME/digitalocean-ai-provider/releases"
    echo "  - Update documentation if needed"
else
    print_error "Publishing failed"
    exit 1
fi
