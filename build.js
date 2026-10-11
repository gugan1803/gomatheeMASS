// Copies the static site into dist/ so Render's default "npm run build" + "dist" publish folder works.
const fs = require('fs');
const out = 'dist';
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out);
for (const f of ['index.html', 'css', 'js']) fs.cpSync(f, `${out}/${f}`, { recursive: true });
console.log('Build complete -> dist/');
