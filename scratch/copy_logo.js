const fs = require('fs');
const path = require('path');

const src = `C:\\Users\\MANASVI\\.gemini\\antigravity\\brain\\fdee5171-ef83-4cf6-84c0-8a6641985009\\media__1785951214093.png`;
const dest = path.join(__dirname, '..', 'public', 'hal-logo.png');
const txtDest = path.join(__dirname, '..', 'src', 'lib', 'hal-logo-b64.ts');

try {
  const buf = fs.readFileSync(src);
  fs.writeFileSync(dest, buf);
  console.log('Copied HAL logo to public/hal-logo.png successfully!');
  const b64 = buf.toString('base64');
  const tsContent = `export const HAL_LOGO_B64 = "data:image/png;base64,${b64}";\n`;
  fs.writeFileSync(txtDest, tsContent);
  console.log('Wrote HAL logo base64 to src/lib/hal-logo-b64.ts successfully!');
} catch (err) {
  console.error('Error copying logo:', err);
}
