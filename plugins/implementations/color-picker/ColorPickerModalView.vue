<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useColorPicker, type PickedColor } from './useColorPicker';
import ShortcutBadge from "@/components/ShortcutBadge.vue";
import {PluginManager} from "@/core";

const { isActive, history, start, clearHistory, copyToClipboard } = useColorPicker();

const copiedIndex = ref<number | null>(null);

const pluginId = String(inject('pluginId'));
const manager = PluginManager.getInstance();


const handleStartPicking = async () => {
  if (!isActive.value) {
    await start();
  }
};

const handleCopyColor = async (color: PickedColor, index: number) => {
  const success = await copyToClipboard(color.hex);
  if (success) {
    copiedIndex.value = index;
    setTimeout(() => {
      copiedIndex.value = null;
    }, 1500);
  }
};

const handleClearHistory = () => {
  clearHistory();
};

// 단축키에서 발생하는 이벤트 리스닝
onMounted(() => {

  window.addEventListener('colorpicker:start', handleStartPicking);
});

onUnmounted(() => {
  window.removeEventListener('colorpicker:start', handleStartPicking);
});
</script>

<template>
  <div class="color-picker-modal">
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

    <div class="history-section">
      <div class="history-header">
        <h3>History</h3>
        <button
          v-if="history.length > 0"
          class="clear-button"
          @click="handleClearHistory"
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
            <span class="color-hex">{{ color.hex }}</span>
            <span class="color-rgb">rgb({{ color.rgb.r }}, {{ color.rgb.g }}, {{ color.rgb.b }})</span>
          </div>
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

<style scoped>
.color-picker-modal {
  min-width: 360px;
  max-width: 420px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.actions {
  margin-bottom: 24px;
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
