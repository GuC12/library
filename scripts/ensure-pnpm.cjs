const fs = require('fs');
const path = require('path');

const userAgent = process.env.npm_config_user_agent || '';

if (!userAgent.includes('pnpm/')) {
  console.error('Use pnpm instead');
  process.exit(1);
}

const rootDir = path.join(__dirname, '..');

for (const fileName of ['package-lock.json', 'yarn.lock']) {
  try {
    fs.unlinkSync(path.join(rootDir, fileName));
  } catch {
    // Lockfile may not exist.
  }
}
