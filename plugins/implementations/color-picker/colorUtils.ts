
// ========================================
// Tailwind CSS Colors
// ========================================

// Tailwind CSS v3 색상 팔레트 (주요 색상만 샘플링)
import {colorConverter, HSL, RGB} from "@/plugins/implementations/color-picker/color-types";

const TAILWIND_COLORS: Record<string, string> = {
  'slate-50': '#f8fafc',
  'slate-100': '#f1f5f9',
  'slate-200': '#e2e8f0',
  'slate-300': '#cbd5e1',
  'slate-400': '#94a3b8',
  'slate-500': '#64748b',
  'slate-600': '#475569',
  'slate-700': '#334155',
  'slate-800': '#1e293b',
  'slate-900': '#0f172a',
  'gray-50': '#f9fafb',
  'gray-100': '#f3f4f6',
  'gray-200': '#e5e7eb',
  'gray-300': '#d1d5db',
  'gray-400': '#9ca3af',
  'gray-500': '#6b7280',
  'gray-600': '#4b5563',
  'gray-700': '#374151',
  'gray-800': '#1f2937',
  'gray-900': '#111827',
  'red-50': '#fef2f2',
  'red-100': '#fee2e2',
  'red-200': '#fecaca',
  'red-300': '#fca5a5',
  'red-400': '#f87171',
  'red-500': '#ef4444',
  'red-600': '#dc2626',
  'red-700': '#b91c1c',
  'red-800': '#991b1b',
  'red-900': '#7f1d1d',
  'orange-50': '#fff7ed',
  'orange-100': '#ffedd5',
  'orange-200': '#fed7aa',
  'orange-300': '#fdba74',
  'orange-400': '#fb923c',
  'orange-500': '#f97316',
  'orange-600': '#ea580c',
  'orange-700': '#c2410c',
  'orange-800': '#9a3412',
  'orange-900': '#7c2d12',
  'yellow-50': '#fefce8',
  'yellow-100': '#fef9c3',
  'yellow-200': '#fef08a',
  'yellow-300': '#fde047',
  'yellow-400': '#facc15',
  'yellow-500': '#eab308',
  'yellow-600': '#ca8a04',
  'yellow-700': '#a16207',
  'yellow-800': '#854d0e',
  'yellow-900': '#713f12',
  'green-50': '#f0fdf4',
  'green-100': '#dcfce7',
  'green-200': '#bbf7d0',
  'green-300': '#86efac',
  'green-400': '#4ade80',
  'green-500': '#22c55e',
  'green-600': '#16a34a',
  'green-700': '#15803d',
  'green-800': '#166534',
  'green-900': '#14532d',
  'blue-50': '#eff6ff',
  'blue-100': '#dbeafe',
  'blue-200': '#bfdbfe',
  'blue-300': '#93c5fd',
  'blue-400': '#60a5fa',
  'blue-500': '#3b82f6',
  'blue-600': '#2563eb',
  'blue-700': '#1d4ed8',
  'blue-800': '#1e40af',
  'blue-900': '#1e3a8a',
  'purple-50': '#faf5ff',
  'purple-100': '#f3e8ff',
  'purple-200': '#e9d5ff',
  'purple-300': '#d8b4fe',
  'purple-400': '#c084fc',
  'purple-500': '#a855f7',
  'purple-600': '#9333ea',
  'purple-700': '#7e22ce',
  'purple-800': '#6b21a8',
  'purple-900': '#581c87',
  'pink-50': '#fdf2f8',
  'pink-100': '#fce7f3',
  'pink-200': '#fbcfe8',
  'pink-300': '#f9a8d4',
  'pink-400': '#f472b6',
  'pink-500': '#ec4899',
  'pink-600': '#db2777',
  'pink-700': '#be185d',
  'pink-800': '#9d174d',
  'pink-900': '#831843',
};

// 색상 차이 계산 (Euclidean distance in RGB space)
function colorDistance(rgb1: RGB, rgb2: RGB): number {
  const dr = rgb1.r - rgb2.r;
  const dg = rgb1.g - rgb2.g;
  const db = rgb1.b - rgb2.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

export function findClosestTailwindColor(hex: string): { name: string; hex: string; distance: number } | null {
  const rgb = colorConverter.hexToRgb(hex);
  let closestName = '';
  let closestHex = '';
  let minDistance = Infinity;

  for (const [name, tailwindHex] of Object.entries(TAILWIND_COLORS)) {
    const tailwindRgb = colorConverter.hexToRgb(tailwindHex);
    const distance = colorDistance(rgb, tailwindRgb);

    if (distance < minDistance) {
      minDistance = distance;
      closestName = name;
      closestHex = tailwindHex;
    }
  }

  if (closestName) {
    return { name: closestName, hex: closestHex, distance: minDistance };
  }

  return null;
}

// ========================================
// Color Variations (Shades, Tints, Tones)
// ========================================

/**
 * Shades: 색상에 검정색을 추가 (어두운 버전)
 */
export function generateShades(hex: string, steps: number = 5): string[] {
  const rgb = colorConverter.hexToRgb(hex);
  const shades: string[] = [];

  for (let i = 1; i <= steps; i++) {
    const factor = i / (steps + 1);
    const shade: RGB = {
      r: Math.round(rgb.r * (1 - factor)),
      g: Math.round(rgb.g * (1 - factor)),
      b: Math.round(rgb.b * (1 - factor)),
    };
    shades.push(colorConverter.rgbToHex(shade));
  }

  return shades;
}

/**
 * Tints: 색상에 흰색을 추가 (밝은 버전)
 */
export function generateTints(hex: string, steps: number = 5): string[] {
  const rgb = colorConverter.hexToRgb(hex);
  const tints: string[] = [];

  for (let i = 1; i <= steps; i++) {
    const factor = i / (steps + 1);
    const tint: RGB = {
      r: Math.round(rgb.r + (255 - rgb.r) * factor),
      g: Math.round(rgb.g + (255 - rgb.g) * factor),
      b: Math.round(rgb.b + (255 - rgb.b) * factor),
    };
    tints.push(colorConverter.rgbToHex(tint));
  }

  return tints;
}

/**
 * Tones: 색상에 회색을 추가 (채도 감소 버전)
 */
export function generateTones(hex: string, steps: number = 5): string[] {
  const hsl = colorConverter.rgbToHsl(colorConverter.hexToRgb(hex));
  const tones: string[] = [];

  for (let i = 1; i <= steps; i++) {
    const factor = i / (steps + 1);
    const tone: HSL = {
      h: hsl.h,
      s: Math.round(hsl.s * (1 - factor)),
      l: hsl.l,
    };
    tones.push(colorConverter.rgbToHex(colorConverter.hslToRgb(tone)));
  }

  return tones;
}

// ========================================
// WCAG Contrast Ratio
// ========================================

/**
 * Relative luminance 계산 (WCAG 2.0 기준)
 */
function getRelativeLuminance(rgb: RGB): number {
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((val) => {
    const v = val / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * WCAG 대비율 계산
 * @returns 대비율 (1 ~ 21)
 */
export function getContrastRatio(hex1: string, hex2: string): number {
  const lum1 = getRelativeLuminance(colorConverter.hexToRgb(hex1));
  const lum2 = getRelativeLuminance(colorConverter.hexToRgb(hex2));

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * WCAG AA/AAA 기준 충족 여부
 */
export function checkWCAG(
  hex1: string,
  hex2: string
): {
  ratio: number;
  aa: boolean; // 4.5:1 (일반 텍스트)
  aaLarge: boolean; // 3:1 (큰 텍스트)
  aaa: boolean; // 7:1 (일반 텍스트)
  aaaLarge: boolean; // 4.5:1 (큰 텍스트)
} {
  const ratio = getContrastRatio(hex1, hex2);

  return {
    ratio: Math.round(ratio * 100) / 100,
    aa: ratio >= 4.5,
    aaLarge: ratio >= 3,
    aaa: ratio >= 7,
    aaaLarge: ratio >= 4.5,
  };
}
