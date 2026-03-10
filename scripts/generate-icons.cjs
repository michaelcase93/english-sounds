const sharp = require('sharp')
const path = require('path')

// Three stacked books with "ES" below, on blue background
// Spine colors match app group palette: purple (advanced), amber (common), green (vowels)
const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#1565C0"/>

  <!-- Bottom book shadow -->
  <rect x="68" y="252" width="382" height="80" rx="10" fill="#0D3B7A" opacity="0.6"/>
  <!-- Bottom book -->
  <rect x="62" y="242" width="382" height="80" rx="10" fill="white"/>
  <rect x="62" y="242" width="26" height="80" rx="10" fill="#2E7D32"/>
  <rect x="76" y="242" width="12" height="80" fill="#2E7D32"/>
  <line x1="108" y1="264" x2="418" y2="264" stroke="#BBDEFB" stroke-width="7" stroke-linecap="round"/>
  <line x1="108" y1="284" x2="418" y2="284" stroke="#BBDEFB" stroke-width="7" stroke-linecap="round"/>
  <line x1="108" y1="304" x2="340" y2="304" stroke="#BBDEFB" stroke-width="7" stroke-linecap="round"/>

  <!-- Middle book shadow -->
  <rect x="72" y="162" width="376" height="80" rx="10" fill="#0D3B7A" opacity="0.5"/>
  <!-- Middle book -->
  <rect x="66" y="152" width="376" height="80" rx="10" fill="white"/>
  <rect x="66" y="152" width="26" height="80" rx="10" fill="#B45309"/>
  <rect x="80" y="152" width="12" height="80" fill="#B45309"/>
  <line x1="112" y1="174" x2="416" y2="174" stroke="#BBDEFB" stroke-width="7" stroke-linecap="round"/>
  <line x1="112" y1="194" x2="416" y2="194" stroke="#BBDEFB" stroke-width="7" stroke-linecap="round"/>
  <line x1="112" y1="214" x2="344" y2="214" stroke="#BBDEFB" stroke-width="7" stroke-linecap="round"/>

  <!-- Top book shadow -->
  <rect x="76" y="72" width="370" height="80" rx="10" fill="#0D3B7A" opacity="0.4"/>
  <!-- Top book -->
  <rect x="70" y="62" width="370" height="80" rx="10" fill="white"/>
  <rect x="70" y="62" width="26" height="80" rx="10" fill="#6D28D9"/>
  <rect x="84" y="62" width="12" height="80" fill="#6D28D9"/>
  <line x1="116" y1="84" x2="414" y2="84" stroke="#BBDEFB" stroke-width="7" stroke-linecap="round"/>
  <line x1="116" y1="104" x2="414" y2="104" stroke="#BBDEFB" stroke-width="7" stroke-linecap="round"/>
  <line x1="116" y1="124" x2="348" y2="124" stroke="#BBDEFB" stroke-width="7" stroke-linecap="round"/>

  <!-- ES text -->
  <text x="256" y="468"
        fill="white"
        font-family="system-ui, -apple-system, Helvetica, Arial, sans-serif"
        font-size="116"
        font-weight="800"
        text-anchor="middle"
        letter-spacing="-3">ES</text>
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
