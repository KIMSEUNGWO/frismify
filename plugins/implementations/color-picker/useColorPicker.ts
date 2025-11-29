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

  return {
    isActive,
    history,
    start,
    stop,
    clearHistory,
    copyToClipboard,
  };
}
