const fs = require('fs');
const sharp = require('sharp');

async function convert() {
  try {
    const webpBuffer = fs.readFileSync('public/bindu-logo.webp');
    const pngBuffer = await sharp(webpBuffer).png().toBuffer();
    const base64Str = pngBuffer.toString('base64');
    
    const newContent = `export const BINDU_LOGO = 'data:image/png;base64,${base64Str}';\n`;
    fs.writeFileSync('lib/logo-base64.ts', newContent);
    console.log('Successfully converted and updated lib/logo-base64.ts!');
  } catch (err) {
    console.error('Error:', err);
  }
}

convert();
