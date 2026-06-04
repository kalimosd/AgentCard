#!/usr/bin/env node
// AgentCard — pixel orca (虎鲸) terminal logo
// Front-facing chibi orca. Characters carry shape; color is enhancement.
//   █▄ = black body  ░ = white eye patches  ▓ = white chin/belly

const R = "\x1b[0m";
const B = "\x1b[1m";

const rows = [
  "        ▄███▄           ",
  "      ▄███████▄         ",
  "     ███████████        ",
  "   ▄█████████████▄      ",
  "  ████░░████░░████      ",
  " ████░░░████░░░████     ",
  "████████████████████    ",
  "███████▓▓▓▓▓▓███████    ",
  " █████▓▓▓▓▓▓▓█████     ",
  "  █████▓▓▓▓▓█████      ",
  "   ██████████████       ",
];

// Foreground colors per glyph
const C = {
  "█": "\x1b[38;2;20;28;32m",   // body — near black
  "▄": "\x1b[38;2;20;28;32m",   // body edge (top)
  "▀": "\x1b[38;2;20;28;32m",   // body edge (bottom)
  "░": "\x1b[38;2;228;238;242m", // eye patch — white
  "▓": "\x1b[38;2;118;130;135m", // chin — softer white/gray for depth
};

let out = "\n";
for (const row of rows) {
  out += "  ";
  for (const ch of row) {
    const color = C[ch];
    out += color ? color + ch + R : " ";
  }
  out += "\n";
}

// Water reflection
out += "  \x1b[2m";
for (const ch of "        ▄███▄           ") {
  out += ch === " " ? " " : "\x1b[38;2;30;45;50m▓\x1b[2m";
}
out += R + "\n";

// Label
const L = "\x1b[38;2;80;190;225m";
out += `\n  ${B}${L}▸ AgentCard${R}  \x1b[2morca keeps watch${R}\n\n`;

console.log(out);
