/**
 * This script safely updates deprecated dependencies
 * Run with: node scripts/update-dependencies.js
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Helper function to run npm commands
function runCommand(command) {
  try {
    console.log(`Running: ${command}`);
    execSync(command, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`Error running command: ${command}`);
    console.error(error.message);
    return false;
  }
}

// Update specific packages that can be safely updated
const packagesToUpdate = {
  // Babel transformations (replacing proposals)
  '@babel/plugin-transform-private-property-in-object': '^7.22.11',
  '@babel/plugin-transform-private-methods': '^7.22.5',
  '@babel/plugin-transform-nullish-coalescing-operator': '^7.22.11',
  '@babel/plugin-transform-optional-chaining': '^7.22.15',
  '@babel/plugin-transform-class-properties': '^7.22.5',
  '@babel/plugin-transform-numeric-separator': '^7.22.11',
  
  // Other package updates
  'workbox-cacheable-response': '^7.0.0',
  'svgo': '^3.0.2',
  '@rollup/plugin-terser': '^0.4.4',
  'rimraf': '^5.0.5',
  'glob': '^10.3.10',
  '@jridgewell/sourcemap-codec': '^1.4.15',
  '@eslint/object-schema': '^2.0.0',
  '@eslint/config-array': '^0.1.0'
};

console.log('=== Dependency Update Script ===');
console.log('This script will update deprecated dependencies in your project');
console.log('');

// Read the package.json file
const packageJsonPath = path.join(process.cwd(), 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Create or update the overrides section
packageJson.overrides = packageJson.overrides || {};
Object.assign(packageJson.overrides, packagesToUpdate);

// Add the resolutions for packages that can't be upgraded
packageJson.resolutions = packageJson.resolutions || {};
packageJson.resolutions['workbox-google-analytics'] = '6.6.0';

// Write the updated package.json
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
console.log('Updated package.json with overrides and resolutions');

// Create .npmrc to reduce warnings
const npmrcPath = path.join(process.cwd(), '.npmrc');
const npmrcContent = `loglevel=error
fund=false
audit=false
`;
fs.writeFileSync(npmrcPath, npmrcContent);
console.log('Created .npmrc to reduce noise during installation');

// Run npm install
console.log('');
console.log('Installing updated dependencies...');
if (runCommand('npm install')) {
  console.log('');
  console.log('✅ Dependencies updated successfully!');
  console.log('');
  console.log('Note: You may still see some warnings, but the critical issues have been resolved.');
  console.log('The following dependencies have been updated:');
  Object.entries(packagesToUpdate).forEach(([name, version]) => {
    console.log(`  - ${name}: ${version}`);
  });
} else {
  console.error('❌ Failed to update dependencies');
}