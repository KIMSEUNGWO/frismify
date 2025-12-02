import { ref } from 'vue';
import {
  hexToRgb as convertHexToRgb,
  rgbToHsl,
  rgbToHsv,
  formatRgb,
  formatHsl,
  formatHsv,
  findClosestTailwindColor,
  type RGB,
  type HSL,
  type HSV,
} from './colorUtils';

export type ColorFormat = 'hex' | 'rgb' | 'hsl' | 'hsv' | 'tailwind';

export interface PickedColor {
  hex: string;
  rgb: RGB;
  hsl: HSL;
  hsv: HSV;
  tailwind: { name: string; hex: string } | null;
  timestamp: number;
}

const SAVED_COLORS_KEY = 'prismify_color_picker_saved';

export function useColorPicker() {
  const isActive = ref(false);
  const history = ref<PickedColor[]>([]);
  const savedColors = ref<PickedColor[]>([]);
  const selectedFormat = ref<ColorFormat>('hex');

  // Load saved colors from localStorage
  const loadSavedColors = () => {
    try {
      const saved = localStorage.getItem(SAVED_COLORS_KEY);
      if (saved) {
        savedColors.value = JSON.parse(saved);
      }
    } catch (error) {
      console.error('[ColorPicker] Failed to load saved colors:', error);
    }
  };

  const hexToRgb = (hex: string): RGB => {
    return convertHexToRgb(hex);
  };

  const pickColor = async (): Promise<PickedColor | null> => {
    if (!('EyeDropper' in window)) {
      console.error('[ColorPicker] EyeDropper API not supported');
      return null;
    }

    try {
      console.log('[ColorPicker] Opening EyeDropper...');
      const eyeDropper = new (window as any).EyeDropper();
      const result = await eyeDropper.open();
      console.log('[ColorPicker] Color picked:', result.sRGBHex);
      const hex = result.sRGBHex.toUpperCase();
      const rgb = hexToRgb(hex);
      const hsl = rgbToHsl(rgb);
      const hsv = rgbToHsv(rgb);
      const tailwind = findClosestTailwindColor(hex);

      return {
        hex,
        rgb,
        hsl,
        hsv,
        tailwind: tailwind ? { name: tailwind.name, hex: tailwind.hex } : null,
        timestamp: Date.now(),
      };
    } catch (error) {
      // 사용자가 ESC로 취소함
      console.log('[ColorPicker] Cancelled or error:', error);
      return null;
    }
  };

  const start = async (): Promise<boolean> => {
    isActive.value = true;

    // 연속 picking (ESC 누를 때까지)
    const color = await pickColor();

    if (color) {
      // 이미 같은 색이 존재하는지 확인
      const existingIndex = history.value.findIndex(c => c.hex === color.hex);

      if (existingIndex !== -1) {
        // 존재하면 해당 색상을 제거하고 맨 위로 올림
        history.value.splice(existingIndex, 1);
      }

      // 맨 위에 추가 (timestamp 업데이트)
      history.value.unshift({
        ...color,
        timestamp: Date.now(),
      });
    }

    isActive.value = false;
    return !!color;
  };

  const stop = () => {
    isActive.value = false;
  };

  const clearHistory = () => {
    history.value = [];
  };

  const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  };

  const getColorString = (color: PickedColor, format: ColorFormat): string => {
    switch (format) {
      case 'hex':
        return color.hex;
      case 'rgb':
        return formatRgb(color.rgb);
      case 'hsl':
        return formatHsl(color.hsl);
      case 'hsv':
        return formatHsv(color.hsv);
      case 'tailwind':
        return color.tailwind ? color.tailwind.name : color.hex;
      default:
        return color.hex;
    }
  };

  const saveColor = (color: PickedColor) => {
    // Check if color already saved
    const exists = savedColors.value.some(c => c.hex === color.hex);
    if (exists) {
      console.log('[ColorPicker] Color already saved:', color.hex);
      return;
    }

    // Add to saved colors
    savedColors.value.unshift(color);

    // Save to localStorage
    try {
      localStorage.setItem(SAVED_COLORS_KEY, JSON.stringify(savedColors.value));
      console.log('[ColorPicker] Color saved:', color.hex);
    } catch (error) {
      console.error('[ColorPicker] Failed to save color:', error);
    }
  };

  const unsaveColor = (hex: string) => {
    savedColors.value = savedColors.value.filter(c => c.hex !== hex);

    // Update localStorage
    try {
      localStorage.setItem(SAVED_COLORS_KEY, JSON.stringify(savedColors.value));
      console.log('[ColorPicker] Color unsaved:', hex);
    } catch (error) {
      console.error('[ColorPicker] Failed to unsave color:', error);
    }
  };

  const isColorSaved = (hex: string): boolean => {
    return savedColors.value.some(c => c.hex === hex);
  };

  const clearSavedColors = () => {
    savedColors.value = [];
    try {
      localStorage.removeItem(SAVED_COLORS_KEY);
    } catch (error) {
      console.error('[ColorPicker] Failed to clear saved colors:', error);
    }
  };

  // Load saved colors on init
  loadSavedColors();

  return {
    isActive,
    history,
    savedColors,
    selectedFormat,
    start,
    stop,
    clearHistory,
    copyToClipboard,
    getColorString,
    saveColor,
    unsaveColor,
    isColorSaved,
    clearSavedColors,
  };
}
