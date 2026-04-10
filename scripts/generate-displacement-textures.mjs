import { writeFileSync, mkdirSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

// --- Minimal PNG writer (no deps) ---

function crc32(buf) {
  let crc = 0xFFFFFFFF
  for (const b of buf) {
    crc ^= b
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0)
  }
  return (crc ^ 0xFFFFFFFF) >>> 0
}

function pngChunk(type, data) {
  const t = Buffer.from(type, 'ascii')
  const d = Buffer.isBuffer(data) ? data : Buffer.from(data)
  const len = Buffer.allocUnsafe(4)
  len.writeUInt32BE(d.length, 0)
  const crcBuf = Buffer.concat([t, d])
  const crc = Buffer.allocUnsafe(4)
  crc.writeUInt32BE(crc32(crcBuf), 0)
  return Buffer.concat([len, t, d, crc])
}

function buildPNG(pixels) {
  const W = 256, H = 256
  const ihdrData = Buffer.allocUnsafe(13)
  ihdrData.writeUInt32BE(W, 0); ihdrData.writeUInt32BE(H, 4)
  ihdrData[8] = 8; ihdrData[9] = 0; ihdrData[10] = 0; ihdrData[11] = 0; ihdrData[12] = 0

  const rawRows = new Uint8Array(H * (W + 1))
  for (let y = 0; y < H; y++) {
    rawRows[y * (W + 1)] = 0 // filter: none
    for (let x = 0; x < W; x++) rawRows[y * (W + 1) + 1 + x] = pixels[y * W + x]
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdrData),
    pngChunk('IDAT', deflateSync(rawRows)),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

// --- Helpers ---
const fract = (x) => x - Math.floor(x)
const lerp = (a, b, t) => a + (b - a) * t
const smooth = (t) => t * t * (3 - 2 * t)

function hash(x, y) {
  return fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453)
}

function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y)
  const xf = x - xi, yf = y - yi
  return lerp(
    lerp(hash(xi, yi), hash(xi + 1, yi), smooth(xf)),
    lerp(hash(xi, yi + 1), hash(xi + 1, yi + 1), smooth(xf)),
    smooth(yf),
  )
}

function fbm(x, y, octaves = 6) {
  let v = 0, a = 0.5
  for (let i = 0; i < octaves; i++) {
    v += a * vnoise(x, y)
    x *= 2; y *= 2; a *= 0.5
  }
  return v
}

// --- Marble pattern ---
function marble(nx, ny) {
  const warp = fbm(nx * 3, ny * 3, 4) * 2
  const v = Math.sin((nx * 6 + ny * 2 + warp) * Math.PI)
  return v * 0.5 + 0.5
}

// --- Voronoi pattern ---
const VORONOI_POINTS = Array.from({ length: 20 }, (_, i) => [
  hash(i * 7, 0),
  hash(0, i * 13),
])

function voronoi(nx, ny) {
  let minD = Infinity
  for (const [px, py] of VORONOI_POINTS) {
    const d = Math.hypot(nx - px, ny - py)
    if (d < minD) minD = d
  }
  return Math.min(minD * 3.5, 1)
}

// --- Generate ---
mkdirSync('src/assets/displacement', { recursive: true })

const W = 256, H = 256
const cloudPx = new Uint8Array(W * H)
const marblePx = new Uint8Array(W * H)
const voronoiPx = new Uint8Array(W * H)

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const nx = x / W, ny = y / H
    cloudPx[y * W + x]   = Math.floor(fbm(nx * 4, ny * 4) * 255)
    marblePx[y * W + x]  = Math.floor(marble(nx, ny) * 255)
    voronoiPx[y * W + x] = Math.floor(voronoi(nx, ny) * 255)
  }
}

writeFileSync('src/assets/displacement/cloud.png',   buildPNG(cloudPx))
writeFileSync('src/assets/displacement/marble.png',  buildPNG(marblePx))
writeFileSync('src/assets/displacement/voronoi.png', buildPNG(voronoiPx))

console.log('Generated: cloud.png, marble.png, voronoi.png → src/assets/displacement/')
