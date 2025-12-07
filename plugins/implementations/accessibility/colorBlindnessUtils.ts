import { colorConverter, RGB } from "@/plugins/implementations/color-picker/color-types";

// ========================================
// Color Blindness Simulation
// ========================================

/**
 * 색맹 유형
 */
export type ColorBlindnessType =
  | 'protanopia'    // 적색맹 (빨강 감지 불가)
  | 'deuteranopia'  // 녹색맹 (초록 감지 불가)
  | 'tritanopia'    // 청색맹 (파랑 감지 불가)
  | 'achromatopsia' // 전색맹 (색 감지 불가, 흑백)
  | 'protanomaly'   // 약한 적색맹
  | 'deuteranomaly' // 약한 녹색맹
  | 'tritanomaly';  // 약한 청색맹

/**
 * 색맹 시뮬레이션 변환 행렬
 * 참고: https://www.color-blindness.com/coblis-color-blindness-simulator/
 */
const COLOR_BLINDNESS_MATRICES: Record<ColorBlindnessType, number[][]> = {
  // Protanopia (적색맹) - 빨강 인식 불가
  protanopia: [
    [0.567, 0.433, 0.0],
    [0.558, 0.442, 0.0],
    [0.0, 0.242, 0.758],
  ],
  // Deuteranopia (녹색맹) - 초록 인식 불가
  deuteranopia: [
    [0.625, 0.375, 0.0],
    [0.7, 0.3, 0.0],
    [0.0, 0.3, 0.7],
  ],
  // Tritanopia (청색맹) - 파랑 인식 불가
  tritanopia: [
    [0.95, 0.05, 0.0],
    [0.0, 0.433, 0.567],
    [0.0, 0.475, 0.525],
  ],
  // Achromatopsia (전색맹) - 흑백
  achromatopsia: [
    [0.299, 0.587, 0.114],
    [0.299, 0.587, 0.114],
    [0.299, 0.587, 0.114],
  ],
  // Protanomaly (약한 적색맹)
  protanomaly: [
    [0.817, 0.183, 0.0],
    [0.333, 0.667, 0.0],
    [0.0, 0.125, 0.875],
  ],
  // Deuteranomaly (약한 녹색맹)
  deuteranomaly: [
    [0.8, 0.2, 0.0],
    [0.258, 0.742, 0.0],
    [0.0, 0.142, 0.858],
  ],
  // Tritanomaly (약한 청색맹)
  tritanomaly: [
    [0.967, 0.033, 0.0],
    [0.0, 0.733, 0.267],
    [0.0, 0.183, 0.817],
  ],
};

/**
 * RGB 색상을 색맹 시뮬레이션으로 변환
 */
function applyColorBlindnessMatrix(rgb: RGB, matrix: number[][]): RGB {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const newR = matrix[0][0] * r + matrix[0][1] * g + matrix[0][2] * b;
  const newG = matrix[1][0] * r + matrix[1][1] * g + matrix[1][2] * b;
  const newB = matrix[2][0] * r + matrix[2][1] * g + matrix[2][2] * b;

  return {
    r: Math.max(0, Math.min(255, Math.round(newR * 255))),
    g: Math.max(0, Math.min(255, Math.round(newG * 255))),
    b: Math.max(0, Math.min(255, Math.round(newB * 255))),
  };
}

/**
 * HEX 색상을 색맹 시뮬레이션으로 변환
 * @param hex 원본 색상 (HEX)
 * @param type 색맹 유형
 * @returns 시뮬레이션된 색상 (HEX)
 */
export function simulateColorBlindness(hex: string, type: ColorBlindnessType): string {
  const rgb = colorConverter.hexToRgb(hex);
  const matrix = COLOR_BLINDNESS_MATRICES[type];
  const simulated = applyColorBlindnessMatrix(rgb, matrix);
  return colorConverter.rgbToHex(simulated);
}

/**
 * 모든 색맹 유형에 대한 시뮬레이션 결과 반환
 */
export function simulateAllColorBlindness(hex: string): Record<ColorBlindnessType, string> {
  return {
    protanopia: simulateColorBlindness(hex, 'protanopia'),
    deuteranopia: simulateColorBlindness(hex, 'deuteranopia'),
    tritanopia: simulateColorBlindness(hex, 'tritanopia'),
    achromatopsia: simulateColorBlindness(hex, 'achromatopsia'),
    protanomaly: simulateColorBlindness(hex, 'protanomaly'),
    deuteranomaly: simulateColorBlindness(hex, 'deuteranomaly'),
    tritanomaly: simulateColorBlindness(hex, 'tritanomaly'),
  };
}

/**
 * 색맹 유형 이름 매핑
 */
export const COLOR_BLINDNESS_LABELS: Record<ColorBlindnessType, { name: string; description: string; prevalence: string }> = {
  protanopia: {
    name: 'Protanopia',
    description: 'Red-Blind',
    prevalence: '1% of males',
  },
  deuteranopia: {
    name: 'Deuteranopia',
    description: 'Green-Blind',
    prevalence: '1% of males',
  },
  tritanopia: {
    name: 'Tritanopia',
    description: 'Blue-Blind',
    prevalence: 'Rare (0.001%)',
  },
  achromatopsia: {
    name: 'Achromatopsia',
    description: 'Total Color Blindness',
    prevalence: 'Very rare',
  },
  protanomaly: {
    name: 'Protanomaly',
    description: 'Red-Weak',
    prevalence: '1% of males',
  },
  deuteranomaly: {
    name: 'Deuteranomaly',
    description: 'Green-Weak',
    prevalence: '5% of males',
  },
  tritanomaly: {
    name: 'Tritanomaly',
    description: 'Blue-Weak',
    prevalence: 'Rare (0.01%)',
  },
};