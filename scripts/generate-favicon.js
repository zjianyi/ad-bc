const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateFavicons() {
  const inputSvg = path.join(process.cwd(), 'public', 'adbclogo.svg');
  const publicDir = path.join(process.cwd(), 'public');

  // Generate favicon.ico (32x32)
  await sharp(inputSvg)
    .resize(32, 32)
    .toFormat('png')
    .toBuffer()
    .then(buffer => {
      fs.writeFileSync(path.join(publicDir, 'favicon.ico'), buffer);
    });

  // Generate apple-touch-icon.png (180x180)
  await sharp(inputSvg)
    .resize(180, 180)
    .toFormat('png')
    .toBuffer()
    .then(buffer => {
      fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), buffer);
    });

  console.log('Favicon files generated successfully!');
}

generateFavicons().catch(console.error); 