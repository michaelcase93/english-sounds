const sharp = require('sharp')
const path = require('path')

// Blue = consonant color #1565C0
const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <!-- Background -->
  <rect width="512" height="512" fill="#1565C0"/>

  <!-- Open book shape (white) -->
  <!-- Left page -->
  <path d="M 68 148 C 68 140 75 134 83 136 L 230 158 C 236 159 240 164 240 170 L 240 358 C 240 365 233 370 226 368 L 79 346 C 73 345 68 339 68 333 Z"
        fill="white"/>
  <!-- Left page text lines -->
  <line x1="92" y1="198" x2="218" y2="210" stroke="#1565C0" stroke-width="9" stroke-linecap="round" opacity="0.25"/>
  <line x1="92" y1="228" x2="218" y2="238" stroke="#1565C0" stroke-width="9" stroke-linecap="round" opacity="0.25"/>
  <line x1="92" y1="258" x2="218" y2="266" stroke="#1565C0" stroke-width="9" stroke-linecap="round" opacity="0.25"/>
  <line x1="92" y1="288" x2="180" y2="294" stroke="#1565C0" stroke-width="9" stroke-linecap="round" opacity="0.25"/>

  <!-- Right page -->
  <path d="M 272 158 L 429 136 C 437 134 444 140 444 148 L 444 333 C 444 339 439 345 433 346 L 286 368 C 279 370 272 365 272 358 Z"
        fill="white"/>
  <!-- Right page text lines -->
  <line x1="294" y1="210" x2="420" y2="198" stroke="#1565C0" stroke-width="9" stroke-linecap="round" opacity="0.25"/>
  <line x1="294" y1="238" x2="420" y2="228" stroke="#1565C0" stroke-width="9" stroke-linecap="round" opacity="0.25"/>
  <line x1="294" y1="266" x2="420" y2="258" stroke="#1565C0" stroke-width="9" stroke-linecap="round" opacity="0.25"/>
  <line x1="294" y1="294" x2="380" y2="288" stroke="#1565C0" stroke-width="9" stroke-linecap="round" opacity="0.25"/>

  <!-- Spine shadow left -->
  <rect x="232" y="148" width="12" height="220" fill="#0D47A1" opacity="0.5" rx="2"/>
  <!-- Spine shadow right -->
  <rect x="268" y="148" width="12" height="220" fill="#0D47A1" opacity="0.5" rx="2"/>
  <!-- Spine center -->
  <rect x="244" y="140" width="24" height="236" fill="#1565C0" rx="4"/>

  <!-- "ES" text -->
  <text x="256" y="462"
        fill="white"
        font-family="system-ui, -apple-system, Helvetica, Arial, sans-serif"
        font-size="108"
        font-weight="800"
        text-anchor="middle"
        letter-spacing="-2">ES</text>
</svg>
`

async function generate() {
  const buf = Buffer.from(svg)
  const outDir = path.join(__dirname, '../public/icons')

  await sharp(buf).resize(512, 512).png().toFile(`${outDir}/icon-512.png`)
  console.log('✓ icon-512.png')

  await sharp(buf).resize(192, 192).png().toFile(`${outDir}/icon-192.png`)
  console.log('✓ icon-192.png')

  await sharp(buf).resize(180, 180).png().toFile(path.join(__dirname, '../public/apple-touch-icon.png'))
  console.log('✓ apple-touch-icon.png')
}

generate().catch(err => { console.error(err); process.exit(1) })
