#!/usr/bin/env node

/**
 * Release script for digitalocean-ai-provider
 * Usage: ./scripts/release.mjs [major|minor|patch]
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

// Release types
const RELEASE_TYPES = ['major', 'minor', 'patch'];

function run(command) {
  console.log(`\n> ${command}`);
  execSync(command, { stdio: 'inherit', cwd: rootDir });
}

function updateChangelog(version) {
  const changelogPath = resolve(rootDir, 'CHANGELOG.md');
  const changelog = readFileSync(changelogPath, 'utf8');
  const date = new Date().toISOString().split('T')[0];
  const newVersion = `\n## [${version}] - ${date}\n\n`;
  
  if (!changelog.includes(`## [${version}]`)) {
    const [header, ...rest] = changelog.split('\n## ');
    const newChangelog = [
      header,
      newVersion,
      rest.join('\n## ')
    ].join('');
    
    writeFileSync(changelogPath, newChangelog);
    console.log(`\n✅ Updated CHANGELOG.md with version ${version}`);
  }
}

async function release() {
  try {
    // Get release type from args
    const type = process.argv[2];
    if (!type || !RELEASE_TYPES.includes(type)) {
      throw new Error(`Please specify release type: ${RELEASE_TYPES.join('|')}`);
    }

    // Ensure working directory is clean
    try {
      run('git diff --quiet');
    } catch (e) {
      throw new Error('Working directory must be clean');
    }

    // Pull latest changes
    run('git pull');

    // Run tests
    run('npm run validate');

    // Clean build
    run('npm run build:clean');

    // Get new version
    const pkg = JSON.parse(readFileSync(resolve(rootDir, 'package.json')));
    const currentVersion = pkg.version;
    
    // Bump version
    run(`npm version ${type} --git-tag-version false`);
    
    // Get new version
    const newPkg = JSON.parse(readFileSync(resolve(rootDir, 'package.json')));
    const newVersion = newPkg.version;
    
    // Update changelog
    updateChangelog(newVersion);

    // Commit changes
    run('git add .');
    run(`git commit -m "chore: release v${newVersion}"`);
    run(`git tag v${newVersion}`);
    
    // Push to remote
    run('git push');
    run('git push --tags');
    
    // Publish to npm
    run('npm publish');

    console.log(`\n🎉 Successfully released version ${newVersion}!`);
    console.log(`\nPrevious: v${currentVersion}`);
    console.log(`Current:  v${newVersion}\n`);

  } catch (error) {
    console.error('\n❌ Release failed:', error.message);
    process.exit(1);
  }
}

release().catch(console.error);
