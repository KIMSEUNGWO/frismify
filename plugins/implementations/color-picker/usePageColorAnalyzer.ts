import { ref } from 'vue';

export interface ColorInfo {
  hex: string;
  rgb: { r: number; g: number; b: number };
  count: number;
  percentage: number;
  category: 'background' | 'text' | 'border';
}

export interface PageColorAnalysis {
  allColors: ColorInfo[];
  backgroundColor: ColorInfo[];
  textColors: ColorInfo[];
  borderColors: ColorInfo[];
  totalElements: number;
}

export function usePageColorAnalyzer() {
  const isAnalyzing = ref(false);
  const analysis = ref<PageColorAnalysis | null>(null);

  // RGB를 HEX로 변환
  const rgbToHex = (r: number, g: number, b: number): string => {
    const toHex = (n: number) => {
      const hex = Math.round(n).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
  };

  // rgba(r, g, b, a) 또는 rgb(r, g, b) 파싱
  const parseRgb = (rgbString: string): { r: number; g: number; b: number } | null => {
    const match = rgbString.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!match) return null;
    return {
      r: parseInt(match[1]),
      g: parseInt(match[2]),
      b: parseInt(match[3]),
    };
  };

  // 색상이 유효한지 확인 (투명색이나 흰색/검정 제외 옵션)
  const isValidColor = (rgbString: string): boolean => {
    // transparent 또는 alpha가 0인 경우 제외
    if (rgbString === 'transparent' || rgbString.includes('rgba') && rgbString.includes(', 0)')) {
      return false;
    }
    return true;
  };

  // RGB를 명도(brightness)로 변환 - 낮을수록 어두움 (검정에 가까움)
  const calculateBrightness = (rgb: { r: number; g: number; b: number }): number => {
    // Perceived brightness formula (ITU-R BT.709)
    return 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b;
  };

  // 웹페이지의 모든 색상 분석
  const analyzePageColors = (): PageColorAnalysis => {
    const colorMap = new Map<string, { count: number; category: Set<string>; rgb: { r: number; g: number; b: number } }>();
    const elements = document.querySelectorAll('*');

    elements.forEach((element) => {
      const computed = window.getComputedStyle(element);

      // Background color
      const bgColor = computed.backgroundColor;
      if (isValidColor(bgColor)) {
        const rgb = parseRgb(bgColor);
        if (rgb) {
          const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
          const existing = colorMap.get(hex) || { count: 0, category: new Set(), rgb };
          existing.count++;
          existing.category.add('background');
          colorMap.set(hex, existing);
        }
      }

      // Text color
      const textColor = computed.color;
      if (isValidColor(textColor)) {
        const rgb = parseRgb(textColor);
        if (rgb) {
          const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
          const existing = colorMap.get(hex) || { count: 0, category: new Set(), rgb };
          existing.count++;
          existing.category.add('text');
          colorMap.set(hex, existing);
        }
      }

      // Border color
      const borderColor = computed.borderColor;
      if (isValidColor(borderColor)) {
        const rgb = parseRgb(borderColor);
        if (rgb) {
          const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
          const existing = colorMap.get(hex) || { count: 0, category: new Set(), rgb };
          existing.count++;
          existing.category.add('border');
          colorMap.set(hex, existing);
        }
      }
    });

    // 총 카운트 계산
    const totalCount = Array.from(colorMap.values()).reduce((sum, item) => sum + item.count, 0);

    // ColorInfo 배열로 변환
    const allColors: ColorInfo[] = [];
    const backgroundColors: ColorInfo[] = [];
    const textColors: ColorInfo[] = [];
    const borderColors: ColorInfo[] = [];

    colorMap.forEach((value, hex) => {
      const percentage = (value.count / totalCount) * 100;

      // 각 카테고리별로 분류
      value.category.forEach((cat) => {
        const colorInfo: ColorInfo = {
          hex,
          rgb: value.rgb,
          count: value.count,
          percentage,
          category: cat as 'background' | 'text' | 'border',
        };

        if (cat === 'background') backgroundColors.push(colorInfo);
        if (cat === 'text') textColors.push(colorInfo);
        if (cat === 'border') borderColors.push(colorInfo);
      });

      // 전체 색상 (주 카테고리 기준)
      const primaryCategory = value.category.has('background')
        ? 'background'
        : value.category.has('text')
        ? 'text'
        : 'border';

      allColors.push({
        hex,
        rgb: value.rgb,
        count: value.count,
        percentage,
        category: primaryCategory,
      });
    });

    // 사용 빈도순으로 정렬 (Top Colors용)
    allColors.sort((a, b) => b.count - a.count);

    // 명도 기준 정렬 (검정에 가까울수록 먼저 - 낮은 brightness가 먼저)
    backgroundColors.sort((a, b) => {
      const brightnessA = calculateBrightness(a.rgb);
      const brightnessB = calculateBrightness(b.rgb);
      return brightnessA - brightnessB;
    });

    textColors.sort((a, b) => {
      const brightnessA = calculateBrightness(a.rgb);
      const brightnessB = calculateBrightness(b.rgb);
      return brightnessA - brightnessB;
    });

    borderColors.sort((a, b) => {
      const brightnessA = calculateBrightness(a.rgb);
      const brightnessB = calculateBrightness(b.rgb);
      return brightnessA - brightnessB;
    });

    return {
      allColors,
      backgroundColor: backgroundColors,
      textColors,
      borderColors,
      totalElements: elements.length,
    };
  };

  const analyze = async () => {
    isAnalyzing.value = true;

    try {
      // 약간의 딜레이 (UI 반응성)
      await new Promise(resolve => setTimeout(resolve, 100));

      const result = analyzePageColors();
      analysis.value = result;

      console.log('[PageColorAnalyzer] Analysis complete:', result);
    } catch (error) {
      console.error('[PageColorAnalyzer] Analysis failed:', error);
    } finally {
      isAnalyzing.value = false;
    }
  };

  const reset = () => {
    analysis.value = null;
  };

  return {
    isAnalyzing,
    analysis,
    analyze,
    reset,
  };
}