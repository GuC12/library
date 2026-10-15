import { copyFile, mkdir, writeFile } from 'node:fs/promises';

const output = new URL('../dist/public/', import.meta.url);
// Serve the SPA for authentication callbacks and direct links on static hosting.
await copyFile(new URL('index.html', output), new URL('404.html', output));
for (const route of ['sign-in', 'sign-up', 'user-portal', 'library']) {
  const directory = new URL(`${route}/`, output);
  await mkdir(directory, { recursive: true });
  await copyFile(new URL('index.html', output), new URL('index.html', directory));
}
await writeFile(new URL('.nojekyll', output), '');
console.log('GitHub Pages routes prepared.');
