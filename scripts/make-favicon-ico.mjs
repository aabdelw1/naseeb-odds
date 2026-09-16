// Wraps a PNG in an .ico container, because Google Search and older browsers still ask for
// /favicon.ico. Run with: node scripts/make-favicon-ico.mjs public/favicon-48.png public/favicon.ico
import { readFileSync, writeFileSync } from 'node:fs'

const [, , input = 'public/favicon-48.png', output = 'public/favicon.ico'] = process.argv
const png = readFileSync(input)
// PNG header: an 8-byte signature, then the IHDR length and tag, then width and height.
const width = png.readUInt32BE(16)
const height = png.readUInt32BE(20)

const header = Buffer.alloc(6)
header.writeUInt16LE(0, 0) // reserved
header.writeUInt16LE(1, 2) // 1 = icon
header.writeUInt16LE(1, 4) // one image in the file

const entry = Buffer.alloc(16)
entry[0] = width >= 256 ? 0 : width // 0 means 256
entry[1] = height >= 256 ? 0 : height
entry[2] = 0 // colours in the palette; 0 for truecolour
entry[3] = 0 // reserved
entry.writeUInt16LE(1, 4) // colour planes
entry.writeUInt16LE(32, 6) // bits per pixel
entry.writeUInt32LE(png.length, 8)
entry.writeUInt32LE(header.length + entry.length, 12) // where the image data starts

writeFileSync(output, Buffer.concat([header, entry, png]))
console.log(`wrote ${output} (${width}x${height}, ${png.length} bytes of PNG)`)
