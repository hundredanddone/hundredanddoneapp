/**
 * WCAG AA contrast audit for the palettes in src/constants/theme.ts.
 *
 * Run after any palette change — including a wholesale retheme from a design file.
 * Colour choices that look fine on a designer's monitor routinely fail here, and the
 * dark theme is the usual offender because it is rarely reviewed as carefully.
 *
 *   npm run check:contrast
 */
import { readFileSync } from 'node:fs';

const lines = readFileSync('src/constants/theme.ts', 'utf8').split(/\r?\n/);

const palette = {};
const themes = {};
let target = null;

for (const raw of lines) {
  const line = raw.trim();
  if (line.startsWith('const palette')) {
    target = palette;
    continue;
  }
  if (line.startsWith('export const lightColors')) {
    target = themes.light = {};
    continue;
  }
  if (line.startsWith('export const darkColors')) {
    target = themes.dark = {};
    continue;
  }
  if (line === '};') {
    target = null;
    continue;
  }
  if (!target) continue;

  const m = line.match(
    /^([A-Za-z0-9]+):\s*(?:palette\.([A-Za-z0-9]+)|'(#[0-9a-fA-F]{6}|rgba?\([^)]*\))')/,
  );
  if (m) target[m[1]] = m[2] ? palette[m[2]] : m[3];
}

const luminance = (hex) => {
  const h = hex.replace('#', '');
  const channels = [0, 2, 4].map((i) => {
    const v = parseInt(h.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
};

const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// Foreground/background pairs the UI actually renders.
const PAIRS = [
  ['text', 'background'],
  ['text', 'surface'],
  ['textMuted', 'background'],
  ['textMuted', 'surface'],
  ['textSubtle', 'surface'],
  ['primary', 'background'],
  ['primary', 'surface'],
  ['primary', 'primarySoft'],
  ['danger', 'surface'],
  ['danger', 'dangerSoft'],
  ['success', 'surface'],
  ['success', 'successSoft'],
  ['warning', 'surface'],
  ['warning', 'warningSoft'],
  ['onPrimary', 'primary'],
  ['onDanger', 'danger'],
];

const AA = 4.5;
let failures = 0;

for (const [name, colors] of Object.entries(themes)) {
  console.log(`\n=== ${name} ===`);
  let bad = 0;
  for (const [fg, bg] of PAIRS) {
    if (!colors[fg] || !colors[bg] || colors[bg].startsWith('rgba')) continue;
    const ratio = contrast(colors[fg], colors[bg]);
    if (ratio < AA) {
      bad += 1;
      failures += 1;
      const tag = ratio >= 3 ? 'LARGE-ONLY' : 'FAIL';
      console.log(
        `  ${tag.padEnd(11)}${ratio.toFixed(2)}:1  ${fg} on ${bg}  (${colors[fg]} / ${colors[bg]})`,
      );
    }
  }
  if (!bad) console.log(`  all ${PAIRS.length} pairs pass WCAG AA (${AA}:1)`);
}

if (failures > 0) {
  console.error(`\n${failures} contrast failure(s).`);
  process.exit(1);
}
console.log('\nAll palettes pass WCAG AA.');
