// Draws the app icons and the link preview card (gold crescent on navy) with the system
// emoji font. Run on macOS with: swift scripts/generate-icons.swift public

import AppKit

func png(width: Int, height: Int, draw: (CGRect) -> Void) -> Data {
  let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: width, pixelsHigh: height, bitsPerSample: 8,
                             samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB,
                             bytesPerRow: 0, bitsPerPixel: 0)!
  NSGraphicsContext.saveGraphicsState()
  NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
  draw(CGRect(x: 0, y: 0, width: width, height: height))
  NSGraphicsContext.restoreGraphicsState()
  return rep.representation(using: .png, properties: [:])!
}

func rgb(_ hex: Int) -> NSColor {
  NSColor(red: CGFloat((hex >> 16) & 0xff) / 255, green: CGFloat((hex >> 8) & 0xff) / 255, blue: CGFloat(hex & 0xff) / 255, alpha: 1)
}
let navy = rgb(0x1d2735), gold = rgb(0xf2c26b), light = rgb(0xe8edf4), muted = rgb(0x93a1b5)

func text(_ s: String, _ font: NSFont, _ color: NSColor) -> NSAttributedString {
  NSAttributedString(string: s, attributes: [.font: font, .foregroundColor: color])
}

func drawCentered(_ string: NSAttributedString, centerX: CGFloat, centerY: CGFloat) {
  let size = string.size()
  string.draw(at: CGPoint(x: centerX - size.width / 2, y: centerY - size.height / 2))
}

func icon(_ size: Int) -> Data {
  png(width: size, height: size) { rect in
    navy.setFill()
    rect.fill()
    drawCentered(text("🌙", .systemFont(ofSize: CGFloat(size) * 0.6), .white), centerX: rect.midX, centerY: rect.midY)
  }
}

func previewCard() -> Data {
  png(width: 1200, height: 630) { rect in
    navy.setFill()
    rect.fill()
    drawCentered(text("🌙", .systemFont(ofSize: 150), .white), centerX: 600, centerY: 440)
    let title = NSMutableAttributedString(attributedString: text("Naseeb ", .systemFont(ofSize: 110, weight: .light), light))
    title.append(text("Odds", .systemFont(ofSize: 110, weight: .semibold), gold))
    drawCentered(title, centerX: 600, centerY: 255)
    drawCentered(text("What are the chances of finding your match in the US?", .systemFont(ofSize: 42), muted), centerX: 600, centerY: 120)
  }
}

let directory = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "public"
let files: [(String, Data)] = [
  ("favicon-32.png", icon(32)),
  ("apple-touch-icon.png", icon(180)),
  ("icon-192.png", icon(192)),
  ("icon-512.png", icon(512)),
  ("og-image.png", previewCard()),
]
for (name, data) in files {
  try data.write(to: URL(fileURLWithPath: "\(directory)/\(name)"))
  print("wrote \(directory)/\(name)")
}
