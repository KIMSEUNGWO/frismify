import { ref } from 'vue';

export interface PickedColor {
  hex: string;
  rgb: { r: number; g: number; b: number };
  timestamp: number;
}

export function useColorPicker() {
  const isActive = ref(false);
  const history = ref<PickedColor[]>([]);

  const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
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

      return {
        hex,
        rgb: hexToRgb(hex),
        timestamp: Date.now(),
      };
    } catch (error) {
      // 사용자가 ESC로 취소함
      console.log('[ColorPicker] Cancelled or error:', error);
      return null;
    }
  };

  const start = async () => {
    isActive.value = true;

    // 연속 picking (ESC 누를 때까지)
    while (isActive.value) {
      const color = await pickColor();

      if (color) {
        history.value.unshift(color);
      } else {
        // ESC로 취소됨 → 종료
        break;
      }
    }

    isActive.value = false;
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

  return {
    isActive,
    history,
    start,
    stop,
    clearHistory,
    copyToClipboard,
  };
}
