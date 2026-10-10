import sharp from "sharp"

const svg = "public/icon.svg"
const targets = [
  ["pwa-192.png", 192],
  ["pwa-512.png", 512],
  ["apple-touch-icon.png", 180],
] as const

for (const [name, size] of targets) {
  await sharp(svg).resize(size, size).png().toFile(`public/${name}`)
  console.log(`public/${name} ${size}x${size}`)
}
