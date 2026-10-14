// simplified furious-qr
export function generateToCanvas(content: string, size = 1000, margin = 0.05) {
  const bytes = new TextEncoder().encode(content);

  const entry = MESSAGE_BYTES.findIndex((cap, i) => bytes.length + (i < 17 ? 2 : 3) <= cap);
  if (entry < 0) throw new Error("CONTENT_TOO_LONG");
  const [version, ecl] = indexToVersionEcl(entry);

  const numMessageBytes = MESSAGE_BYTES[entry];
  const message = new Uint8Array(numMessageBytes);
  let buf = 0;
  let bufLen = 0;
  let pos = 0;
  const push = (value: number, n: number) => {
    buf = (buf << n) | value;
    bufLen += n;
    while (bufLen >= 8) {
      bufLen -= 8;
      message[pos++] = (buf >> bufLen) & 0xff;
    }
  };
  push(0b0100, 4);
  push(bytes.length, version < 10 ? 8 : 16);
  for (const b of bytes) push(b, 8);
  push(0, 4); // always 4 to byte align
  for (let pad = 0b1110_1100; pos < numMessageBytes; pad ^= 0b1111_1101) push(pad, 8);

  // Reed-Solomon generator polynomial, highest degree first, leading 1 omitted
  const numBlocks = NUM_BLOCKS[entry];
  const ecPerBlock = EC_PER_BLOCK[entry];
  const numBytes = numMessageBytes + numBlocks * ecPerBlock;
  const mul = (a: number, b: number) =>
    a && b ? EXP_TABLE[(LOG_TABLE[a] + LOG_TABLE[b]) % 255] : 0;
  const gen = new Uint8Array(ecPerBlock);
  gen[ecPerBlock - 1] = 1;
  for (let i = 0, root = 1; i < ecPerBlock; i++, root = mul(root, 2)) {
    for (let j = 0; j < ecPerBlock; j++) gen[j] = mul(gen[j], root) ^ (gen[j + 1] ?? 0);
  }

  // Split message into blocks, the last (numMessageBytes % numBlocks) one byte longer, and add ec
  const shortLen = Math.floor(numMessageBytes / numBlocks);
  const numShort = numBlocks - (numMessageBytes % numBlocks);
  const blocks = [];
  for (let b = 0, start = 0; b < numBlocks; b++) {
    const data = message.subarray(start, (start += shortLen + (b < numShort ? 0 : 1)));
    const ec = new Uint8Array(ecPerBlock);
    for (const d of data) {
      const factor = d ^ ec[0];
      ec.copyWithin(0, 1);
      ec[ecPerBlock - 1] = 0;
      for (let j = 0; j < ecPerBlock; j++) ec[j] ^= mul(gen[j], factor);
    }
    blocks.push({ data, ec });
  }

  // Interleave blocks column by column, extra byte at end for remainder bits
  const seq = new Uint8Array(numBytes + 1);
  let k = 0;
  for (let i = 0; i <= shortLen; i++) {
    for (const { data } of blocks) if (i < data.length) seq[k++] = data[i];
  }
  for (let i = 0; i < ecPerBlock; i++) {
    for (const { ec } of blocks) seq[k++] = ec[i];
  }

  const width = version * 4 + 17;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#000";
  const code = size * (1 - 2 * margin);
  const px = (i: number) => Math.round(size * margin + (i * code) / width);

  const reserved = new Uint8Array(width * width);
  const set = (x: number, y: number, dark: number) => {
    reserved[y * width + x] = 1;
    if (dark) ctx.fillRect(px(x), px(y), px(x + 1) - px(x), px(y + 1) - px(y));
  };

  for (const [cx, cy] of [
    [3, 3],
    [3, width - 4],
    [width - 4, 3],
  ]) {
    for (let y = cy - 4; y <= cy + 4; y++) {
      for (let x = cx - 4; x <= cx + 4; x++) {
        const d = Math.max(Math.abs(x - cx), Math.abs(y - cy));
        if (x >= 0 && y >= 0 && x < width && y < width) set(x, y, +(d !== 2 && d !== 4));
      }
    }
  }

  if (version >= 2) {
    const len = Math.floor(version / 7) + 2;
    const last = width - 7;
    const coords = [6];
    for (let i = len - 2; i >= 1; i--) coords.push(last - i * ALIGN_OFFSETS[version - 7]);
    coords.push(last);
    for (let i = 0; i < len; i++) {
      for (let j = 0; j < len; j++) {
        if (reserved[coords[j] * width + coords[i]]) continue; // overlaps finder
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            set(coords[i] + dx, coords[j] + dy, +(Math.max(Math.abs(dx), Math.abs(dy)) !== 1));
          }
        }
      }
    }
  }

  // After alignment so overlapping ones can be skipped, overlaps match alignment anyway
  for (let i = 8; i < width - 8; i++) {
    set(6, i, (i & 1) ^ 1);
    set(i, 6, (i & 1) ^ 1);
  }

  if (version >= 7) {
    const info = VERSION_INFO[version - 7];
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 3; j++) {
        const bit = (info >> (i * 3 + j)) & 1;
        set(width - 11 + j, i, bit);
        set(i, width - 11 + j, bit);
      }
    }
  }

  const format = FORMAT_INFO[ecl];
  for (let i = 0; i < 6; i++) set(8, i, (format >> i) & 1);
  set(8, 7, (format >> 6) & 1);
  set(8, 8, (format >> 7) & 1);
  set(7, 8, (format >> 8) & 1);
  for (let i = 9; i < 15; i++) set(14 - i, 8, (format >> i) & 1);
  for (let i = 0; i < 8; i++) set(width - 1 - i, 8, (format >> i) & 1);
  for (let i = 8; i < 15; i++) set(8, width - 15 + i, (format >> i) & 1);
  set(8, width - 8, 1);

  // Data modules in zigzag column pairs from the right, skipping reserved ones and the
  // vertical timing column, with mask 2: x % 3 === 0
  let bitIdx = 0;
  for (let right = width - 1; right > 0; right -= 2) {
    if (right === 6) right--;
    for (let vert = 0; vert < width; vert++) {
      const y = (right + 1) & 2 ? vert : width - 1 - vert;
      for (let x = right; x > right - 2; x--) {
        if (reserved[y * width + x]) continue;
        set(x, y, ((seq[bitIdx >> 3] >> (7 - (bitIdx & 7))) & 1) ^ +(x % 3 === 0));
        bitIdx++;
      }
    }
  }

  return canvas;
}

const EXP_TABLE = new Uint8Array(255);
const LOG_TABLE = new Uint8Array(256);
for (let i = 0, x = 1; i < 255; i++) {
  EXP_TABLE[i] = x;
  LOG_TABLE[x] = i;
  x = (x << 1) ^ (x & 0x80 ? 0x11d : 0);
}

function indexToVersionEcl(i: number): [version: number, ecl: number] {
  if (i < 4) return [1, 3 - i];
  if (i < 7) return [2, 6 - i];
  if (i < 13) return [(i - 1) >> 1, i & 1];
  return [i - 7, 0];
}

// prettier-ignore
const MESSAGE_BYTES = [
  9, 13, 16, 19,
  22, 28, 34,
  44, 55, 64, 80, 86, 108,
  136, 156, 194, 232, 274, 324, 370,
  428, 461, 523, 589, 647, 721, 795,
  861, 932, 1006, 1094, 1174, 1276, 1370,
  1468, 1531, 1631, 1735, 1843, 1955, 2071,
  2191, 2306, 2434, 2566, 2702, 2812, 2956,
];

// prettier-ignore
const EC_PER_BLOCK = [
  17, 13, 10, 7,
  22, 16, 10,
  26, 15, 18, 20, 24, 26,
  18, 20, 24, 30, 18, 20, 24,
  26, 30, 22, 24, 28, 30, 28,
  28, 28, 28, 30, 30, 26, 28,
  30, 30, 30, 30, 30, 30, 30,
  30, 30, 30, 30, 30, 30, 30,
];

// prettier-ignore
const NUM_BLOCKS = [
  1, 1, 1, 1,
  1, 1, 1,
  1, 1, 2, 1, 2, 1,
  2, 2, 2, 2, 4, 4, 4,
  4, 4, 6, 6, 6, 6, 7,
  8, 8, 9, 9, 10, 12, 12,
  12, 13, 14, 15, 16, 17, 18,
  19, 19, 20, 21, 22, 24, 25,
];

// prettier-ignore
/** Starts at 7 */
const ALIGN_OFFSETS = [
  16, 18,
  20, 22, 24, 26,
  28, 20, 22, 24,
  24, 26, 28, 28,
  22, 24, 24, 26,
  26, 28, 28, 24,
  24, 26, 26, 26,
  28, 28, 24, 26,
  26, 26, 28, 28,
];

// prettier-ignore
/** Starts at 7 */
const VERSION_INFO = [
  0x07c94, 0x085bc,
  0x09a99, 0x0a4d3, 0x0bbf6, 0x0c762,
  0x0d847, 0x0e60d, 0x0f928, 0x10b78,
  0x1145d, 0x12a17, 0x13532, 0x149a6,
  0x15683, 0x168c9, 0x177ec, 0x18ec4,
  0x191e1, 0x1afab, 0x1b08e, 0x1cc1a,
  0x1d33f, 0x1ed75, 0x1f250, 0x209d5,
  0x216f0, 0x228ba, 0x2379f, 0x24b0b,
  0x2542e, 0x26a64, 0x27541, 0x28c69,
];

const FORMAT_INFO = [0x7daa, 0x5e7c, 0x3f31, 0x1ce7];
