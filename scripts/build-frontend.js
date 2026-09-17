const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const source = path.join(root, 'frontend');
const destination = path.join(root, 'dist');

fs.rmSync(destination, { recursive: true, force: true });
fs.cpSync(source, destination, { recursive: true });

const configuredApiBaseUrl = (process.env.API_BASE_URL || '').trim();
if (configuredApiBaseUrl) {
  const serializedConfig = JSON.stringify(
    {
      apiBaseUrl: configuredApiBaseUrl
    },
    null,
    2
  );
  fs.writeFileSync(
    path.join(destination, 'config.js'),
    `window.TRENTON_FLAMES_CONFIG = ${serializedConfig};\n`
  );
}

console.log('Frontend build complete: dist/');
