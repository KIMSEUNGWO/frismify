<template>
  <div>
    <div class="actions">
      <button
          class="start-button"
          @click="handleStartPicking"
          :disabled="isActive"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18.3673 7.64313C19.6263 8.90144 20.4834 10.5049 20.8312 12.2505C21.1789 13.9965 21.0014 15.8068 20.3204 17.4517C19.6394 19.0965 18.4861 20.5026 17.006 21.4918C15.5258 22.481 13.7853 23.0084 12.005 23.0084C10.2247 23.0084 8.48419 22.481 7.00402 21.4918C5.52394 20.5026 4.37058 19.0965 3.68957 17.4517C3.00855 15.8068 2.83108 13.9965 3.17882 12.2505C3.52656 10.5049 4.38374 8.90144 5.64269 7.64313L11.9991 1.27496L18.3673 7.64313Z" fill="currentColor"/>
        </svg>
        {{ isActive ? 'Picking...' : 'Start Picking' }}
      </button>
    </div>

    <!-- Format Selector -->
    <div class="format-selector">
      <button
          v-for="format in formatOptions"
          :key="format.value"
          class="format-button"
          :class="{ active: selectedFormat === format.value }"
          @click="selectedFormat = format.value"
      >
        {{ format.label }}
      </button>
    </div>

    <!-- Saved Colors Section -->
    <div v-if="savedColors.length > 0" class="saved-section">
      <div class="saved-header">
        <h3>Saved Colors</h3>
        <button class="clear-button" @click="clearSavedColors">
          Clear All
        </button>
      </div>
      <div class="saved-colors-grid">
        <div
            v-for="color in savedColors"
            :key="color.hex"
            class="saved-color-item"
            @click="handleCopyColor(color, -1)"
            :title="color.hex"
        >
          <div
              class="saved-color-swatch"
              :style="{ backgroundColor: color.hex }"
          />
          <button
              class="unsave-button"
              @click.stop="unsaveColor(color.hex)"
              title="Remove"
          >
            ×
          </button>
        </div>
      </div>
    </div>

    <div class="history-section">
      <div class="history-header">
        <h3>History</h3>
        <button
            v-if="history.length > 0"
            class="clear-button"
            @click="clearHistory"
        >
          Clear All
        </button>
      </div>

      <div v-if="history.length === 0" class="empty-state">
        <div class="empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" stroke-width="1.5"/>
            <path d="M8 12H16M12 8V16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </div>
        <p>No colors picked yet</p>
        <span>Click "Start Picking" and click anywhere on the page</span>
      </div>

      <div v-else class="color-list">
        <div
            v-for="(color, index) in history"
            :key="color.timestamp"
            class="color-item"
            @click="handleCopyColor(color, index)"
        >
          <div
              class="color-swatch"
              :style="{ backgroundColor: color.hex }"
          />
          <div class="color-info">
            <span class="color-hex">{{ getColorString(color, selectedFormat) }}</span>
            <span class="color-rgb" v-if="selectedFormat === 'tailwind' && color.tailwind">
                {{ color.tailwind.hex }}
              </span>
            <span class="color-rgb" v-else>
                {{ color.hex }}
              </span>
          </div>
          <button
              class="save-button"
              :class="{ saved: isColorSaved(color.hex) }"
              @click.stop="isColorSaved(color.hex) ? unsaveColor(color.hex) : saveColor(color)"
              :title="isColorSaved(color.hex) ? 'Remove from saved' : 'Save color'"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path v-if="isColorSaved(color.hex)" d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor"/>
              <path v-else d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="currentColor" stroke-width="2"/>
            </svg>
          </button>
          <div class="copy-indicator" :class="{ visible: copiedIndex === index }">
            Copied!
          </div>
        </div>
      </div>
    </div>

    <div class="tips">
      <p><strong>Tip:</strong> Press <kbd>ESC</kbd> to stop picking. Click on colors to copy HEX value.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  type ColorFormat,
  type PickedColor,
  useColorPicker
} from "@/plugins/implementations/color-picker/useColorPicker";
import {onMounted, onUnmounted, ref} from "vue";

const { isActive, history, savedColors, selectedFormat, start, clearHistory, copyToClipboard, getColorString, saveColor, unsaveColor, isColorSaved, clearSavedColors } = useColorPicker();

const copiedIndex = ref<number | null>(null);

const emits = defineEmits<{
  (e: 'switchTab', tabName: 'picker' | 'analysis' | 'tools'): void;
  (e: 'getTab'): string;
}>();

const handleStartPicking = async () => {
  if (emits('getTab') !== 'picker') {
    emits('switchTab', 'picker');
  }
  await start();
};

const handleCopyColor = async (color: PickedColor, index: number) => {
  const colorString = getColorString(color, selectedFormat.value);
  const success = await copyToClipboard(colorString);
  if (success) {
    copiedIndex.value = index;
    setTimeout(() => {
      copiedIndex.value = null;
    }, 1500);
  }
};

const formatOptions: { value: ColorFormat; label: string }[] = [
  { value: 'hex', label: 'HEX' },
  { value: 'rgb', label: 'RGB' },
  { value: 'hsl', label: 'HSL' },
  { value: 'hsv', label: 'HSV' },
  { value: 'tailwind', label: 'Tailwind' },
];

// 단축키에서 발생하는 이벤트 리스닝
onMounted(() => {
  window.addEventListener('colorpicker:start', handleStartPicking);
});

onUnmounted(() => {
  window.removeEventListener('colorpicker:start', handleStartPicking);
});
</script>
<style scoped>

.actions {
  margin-bottom: 16px;
}

/* Format Selector */
.format-selector {
  display: flex;
  gap: 6px;
  margin-bottom: 20px;
  padding: 4px;
  background: var(--card-bg-color);
  border-radius: 8px;
}

.format-button {
  flex: 1;
  padding: 6px 12px;
  background: transparent;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--font-color-2);
  cursor: pointer;
  transition: all 0.2s ease;
}

.format-button:hover {
  background: var(--card-bg-hover);
  color: var(--font-color-1);
}

.format-button.active {
  background: var(--purple);
  color: #fff;
  box-shadow: 0 2px 6px rgba(102, 126, 234, 0.3);
}

.start-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 14px 20px;
  background: var(--gradient-point);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 14px rgba(102, 126, 234, 0.4);
}

.start-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
}

.start-button:active:not(:disabled) {
  transform: translateY(0);
}

.start-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.history-section {
  background: var(--card-bg-color);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.history-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--font-color-1);
}

.clear-button {
  padding: 4px 10px;
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 12px;
  color: var(--font-color-2);
  cursor: pointer;
  transition: all 0.15s ease;
}

.clear-button:hover {
  background: var(--card-bg-hover);
}

.empty-state {
  text-align: center;
  padding: 24px 16px;
  color: #999;
}

.empty-icon {
  margin-bottom: 12px;
  opacity: 0.5;
}

.empty-state p {
  margin: 0 0 4px 0;
  font-size: 14px;
  color: #666;
}

.empty-state span {
  font-size: 12px;
  color: #999;
}

.color-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 280px;
  overflow-y: auto;
}

.color-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: var(--card-bg-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;
}

.color-item:hover {
  background: var(--card-bg-hover);
}

.save-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: var(--font-color-2);
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.save-button:hover {
  background: var(--card-bg-hover);
  color: var(--purple);
}

.save-button.saved {
  color: #fbbf24;
}

.save-button.saved:hover {
  color: #f59e0b;
}

/* Saved Colors Section */
.saved-section {
  background: var(--card-bg-color);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.saved-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.saved-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--font-color-1);
}

.saved-colors-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(50px, 1fr));
  gap: 8px;
}

.saved-color-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  overflow: hidden;
}

.saved-color-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.saved-color-item:hover .unsave-button {
  opacity: 1;
}

.saved-color-swatch {
  width: 100%;
  height: 100%;
  border-radius: 8px;
  box-shadow: inset 0 0 0 1px rgba(0,0,0,0.1);
}

.unsave-button {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.unsave-button:hover {
  background: rgba(239, 68, 68, 0.9);
}

.color-swatch {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  box-shadow: inset 0 0 0 1px rgba(0,0,0,0.1);
  flex-shrink: 0;
}

.color-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.color-hex {
  font-size: 14px;
  font-weight: 600;
  font-family: 'SF Mono', Monaco, monospace;
  color: var(--font-color-1);
}

.color-rgb {
  font-size: 12px;
  font-family: 'SF Mono', Monaco, monospace;
  color: var(--font-color-2);
}

.copy-indicator {
  position: absolute;
  right: 12px;
  padding: 4px 8px;
  background: #10b981;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  border-radius: 4px;
  opacity: 0;
  transform: translateX(10px);
  transition: all 0.2s ease;
}

.copy-indicator.visible {
  opacity: 1;
  transform: translateX(0);
}

.tips {
  padding: 12px 16px;
  background: #fff9e6;
  border-radius: 8px;
  border: 1px solid #ffeeba;
}

.tips p {
  margin: 0;
  font-size: 12px;
  color: #856404;
}

.tips kbd {
  display: inline-block;
  padding: 2px 6px;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 11px;
  font-family: inherit;
  box-shadow: 0 1px 0 rgba(0,0,0,0.1);
}

</style>