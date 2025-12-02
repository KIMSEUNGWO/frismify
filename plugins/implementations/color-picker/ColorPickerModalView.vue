<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, inject } from 'vue';
import { useColorPicker, type PickedColor, type ColorFormat } from './useColorPicker';
import { usePageColorAnalyzer } from './usePageColorAnalyzer';
import { checkWCAG, generateShades, generateTints, generateTones } from './colorUtils';
import {PluginManager} from "@/core";
import {HTMLButtonElement} from "linkedom";

const { isActive, history, savedColors, selectedFormat, start, clearHistory, copyToClipboard, getColorString, saveColor, unsaveColor, isColorSaved, clearSavedColors } = useColorPicker();
const { isAnalyzing, analysis, analyze } = usePageColorAnalyzer();

const copiedIndex = ref<number | null>(null);
const activeTab = ref<'picker' | 'analysis' | 'tools'>('picker');
const copiedColor = ref<string | null>(null);

// Tools tab state
const contrastColor1 = ref('#000000');
const contrastColor2 = ref('#FFFFFF');
const selectedColorForVariations = ref<string>('#667eea');

const pluginId = String(inject('pluginId'));
const manager = PluginManager.getInstance();


const props = defineProps({
  isFold: {
    type: Boolean,
    required: true
  }
});
const emit = defineEmits<{
  'disabledFold': [],
}>();
const handleStartPicking = async () => {
  if (activeTab.value !== 'picker') {
    switchTab('picker');
  }
  // TODO : Color Picker 반복하는거 구상해야함
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

const handleClearHistory = () => {
  clearHistory();
};

const handleAnalyzePage = async () => {
  await analyze();
};

const handleCopyAnalyzedColor = async (hex: string) => {
  const success = await copyToClipboard(hex);
  if (success) {
    copiedColor.value = hex;
    setTimeout(() => {
      copiedColor.value = null;
    }, 1500);
  }
};

const switchTab = (tab: 'picker' | 'analysis' | 'tools') => {
  activeTab.value = tab;
};

// Contrast ratio computed
const contrastResult = computed(() => {
  return checkWCAG(contrastColor1.value, contrastColor2.value);
});

// Color variations computed
const shades = computed(() => generateShades(selectedColorForVariations.value, 5));
const tints = computed(() => generateTints(selectedColorForVariations.value, 5));
const tones = computed(() => generateTones(selectedColorForVariations.value, 5));

// Top colors (상위 10개만)
const topColors = computed(() => {
  if (!analysis.value) return [];
  return analysis.value.allColors.slice(0, 10);
});

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
    <!-- Tab Navigation -->
    <div class="tab-navigation">
      <button
        class="tab-button"
        :class="{ active: activeTab === 'picker' }"
        @click="switchTab('picker')"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18.3673 7.64313C19.6263 8.90144 20.4834 10.5049 20.8312 12.2505C21.1789 13.9965 21.0014 15.8068 20.3204 17.4517C19.6394 19.0965 18.4861 20.5026 17.006 21.4918C15.5258 22.481 13.7853 23.0084 12.005 23.0084C10.2247 23.0084 8.48419 22.481 7.00402 21.4918C5.52394 20.5026 4.37058 19.0965 3.68957 17.4517C3.00855 15.8068 2.83108 13.9965 3.17882 12.2505C3.52656 10.5049 4.38374 8.90144 5.64269 7.64313L11.9991 1.27496L18.3673 7.64313Z" fill="currentColor"/>
        </svg>
        Color Picker
      </button>
      <button
        class="tab-button"
        :class="{ active: activeTab === 'analysis' }"
        @click="switchTab('analysis')"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 13C6.6 5 17.4 5 21 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <circle cx="12" cy="10" r="3" stroke="currentColor" stroke-width="2"/>
        </svg>
        Page Analysis
      </button>
      <button
        class="tab-button"
        :class="{ active: activeTab === 'tools' }"
        @click="switchTab('tools')"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4Z" stroke="currentColor" stroke-width="2"/>
          <path d="M12 8V12L14.5 14.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        Tools
      </button>
    </div>

    <!-- Color Picker Tab -->
    <div v-if="activeTab === 'picker'" class="tab-content">
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

    <!-- Page Analysis Tab -->
    <div v-else-if="activeTab === 'analysis'" class="tab-content">
      <div class="actions">
        <button
          class="analyze-button"
          @click="handleAnalyzePage"
          :disabled="isAnalyzing"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 13C6.6 5 17.4 5 21 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <circle cx="12" cy="10" r="3" stroke="currentColor" stroke-width="2"/>
          </svg>
          {{ isAnalyzing ? 'Analyzing...' : 'Analyze Page Colors' }}
        </button>
      </div>

      <div v-if="!analysis" class="empty-state">
        <div class="empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 13C6.6 5 17.4 5 21 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <circle cx="12" cy="10" r="3" stroke="currentColor" stroke-width="2"/>
          </svg>
        </div>
        <p>No analysis yet</p>
        <span>Click "Analyze Page Colors" to scan this page</span>
      </div>

      <div v-else class="analysis-results">
        <!-- Top Colors (Brand Colors) -->
        <div class="analysis-section">
          <div class="section-header">
            <h3>Top Colors (Brand Palette)</h3>
            <span class="count-badge">{{ topColors.length }}</span>
          </div>
          <div class="color-grid">
            <div
              v-for="color in topColors"
              :key="color.hex"
              class="color-card"
              @click="handleCopyAnalyzedColor(color.hex)"
            >
              <div class="color-preview" :style="{ backgroundColor: color.hex }" />
              <div class="color-details">
                <span class="color-hex-small">{{ color.hex }}</span>
                <span class="color-usage">{{ color.percentage.toFixed(1) }}%</span>
              </div>
              <div class="copy-indicator" :class="{ visible: copiedColor === color.hex }">
                Copied!
              </div>
            </div>
          </div>
        </div>

        <!-- Color Distribution (Pie Chart Alternative) -->
        <div class="analysis-section">
          <div class="section-header">
            <h3>Color Distribution</h3>
          </div>
          <div class="distribution-bars">
            <div
              v-for="color in topColors.slice(0, 8)"
              :key="color.hex"
              class="distribution-bar"
            >
              <div class="bar-label">
                <div class="bar-color" :style="{ backgroundColor: color.hex }" />
                <span class="bar-hex">{{ color.hex }}</span>
              </div>
              <div class="bar-container">
                <div
                  class="bar-fill"
                  :style="{
                    width: `${color.percentage}%`,
                    backgroundColor: color.hex
                  }"
                />
              </div>
              <span class="bar-percentage">{{ color.percentage.toFixed(1) }}%</span>
            </div>
          </div>
        </div>

        <!-- Text Colors -->
        <div class="analysis-section">
          <div class="section-header">
            <h3>Text Colors</h3>
            <span class="count-badge">{{ analysis.textColors.length }}</span>
          </div>
          <div class="color-chips">
            <div
              v-for="color in analysis.textColors.slice(0, 12)"
              :key="color.hex"
              class="color-chip"
              @click="handleCopyAnalyzedColor(color.hex)"
            >
              <div class="chip-swatch" :style="{ backgroundColor: color.hex }" />
              <span class="chip-hex">{{ color.hex }}</span>
              <div class="copy-indicator" :class="{ visible: copiedColor === color.hex }">
                Copied!
              </div>
            </div>
          </div>
        </div>

        <!-- Background Colors -->
        <div class="analysis-section">
          <div class="section-header">
            <h3>Background Colors</h3>
            <span class="count-badge">{{ analysis.backgroundColor.length }}</span>
          </div>
          <div class="color-chips">
            <div
              v-for="color in analysis.backgroundColor.slice(0, 12)"
              :key="color.hex"
              class="color-chip"
              @click="handleCopyAnalyzedColor(color.hex)"
            >
              <div class="chip-swatch" :style="{ backgroundColor: color.hex }" />
              <span class="chip-hex">{{ color.hex }}</span>
              <div class="copy-indicator" :class="{ visible: copiedColor === color.hex }">
                Copied!
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tools Tab -->
    <div v-else-if="activeTab === 'tools'" class="tab-content">
      <!-- WCAG Contrast Checker -->
      <div class="tool-section">
        <h3 class="tool-title">WCAG Contrast Checker</h3>
        <p class="tool-description">Check color contrast for accessibility compliance</p>

        <div class="contrast-inputs">
          <div class="color-input-group">
            <label>Foreground</label>
            <div class="color-input-wrapper">
              <input
                type="color"
                v-model="contrastColor1"
                class="color-picker-input"
              />
              <input
                type="text"
                v-model="contrastColor1"
                class="color-text-input"
                placeholder="#000000"
              />
            </div>
          </div>
          <div class="color-input-group">
            <label>Background</label>
            <div class="color-input-wrapper">
              <input
                type="color"
                v-model="contrastColor2"
                class="color-picker-input"
              />
              <input
                type="text"
                v-model="contrastColor2"
                class="color-text-input"
                placeholder="#FFFFFF"
              />
            </div>
          </div>
        </div>

        <div class="contrast-preview" :style="{
          backgroundColor: contrastColor2,
          color: contrastColor1
        }">
          <span>Sample Text</span>
        </div>

        <div class="contrast-result">
          <div class="ratio-display">
            <span class="ratio-value">{{ contrastResult.ratio.toFixed(2) }}</span>
            <span class="ratio-label">:1</span>
          </div>
          <div class="wcag-badges">
            <div class="wcag-badge" :class="{ pass: contrastResult.aa, fail: !contrastResult.aa }">
              <strong>AA</strong>
              <span>Normal</span>
              <span class="badge-status">{{ contrastResult.aa ? '✓ Pass' : '✗ Fail' }}</span>
            </div>
            <div class="wcag-badge" :class="{ pass: contrastResult.aaLarge, fail: !contrastResult.aaLarge }">
              <strong>AA</strong>
              <span>Large</span>
              <span class="badge-status">{{ contrastResult.aaLarge ? '✓ Pass' : '✗ Fail' }}</span>
            </div>
            <div class="wcag-badge" :class="{ pass: contrastResult.aaa, fail: !contrastResult.aaa }">
              <strong>AAA</strong>
              <span>Normal</span>
              <span class="badge-status">{{ contrastResult.aaa ? '✓ Pass' : '✗ Fail' }}</span>
            </div>
            <div class="wcag-badge" :class="{ pass: contrastResult.aaaLarge, fail: !contrastResult.aaaLarge }">
              <strong>AAA</strong>
              <span>Large</span>
              <span class="badge-status">{{ contrastResult.aaaLarge ? '✓ Pass' : '✗ Fail' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Color Variations -->
      <div class="tool-section">
        <h3 class="tool-title">Color Variations</h3>
        <p class="tool-description">Generate shades, tints, and tones</p>

        <div class="variation-input">
          <label>Base Color</label>
          <div class="color-input-wrapper">
            <input
              type="color"
              v-model="selectedColorForVariations"
              class="color-picker-input"
            />
            <input
              type="text"
              v-model="selectedColorForVariations"
              class="color-text-input"
              placeholder="#667eea"
            />
          </div>
        </div>

        <div class="variations">
          <div class="variation-group">
            <h4>Shades <span class="variation-hint">(+ Black)</span></h4>
            <div class="variation-colors">
              <div
                v-for="(shade, index) in shades"
                :key="shade"
                class="variation-color"
                :style="{ backgroundColor: shade }"
                @click="copyToClipboard(shade)"
                :title="shade"
              />
            </div>
          </div>
          <div class="variation-group">
            <h4>Base Color</h4>
            <div class="variation-colors">
              <div
                class="variation-color variation-base"
                :style="{ backgroundColor: selectedColorForVariations }"
                @click="copyToClipboard(selectedColorForVariations)"
                :title="selectedColorForVariations"
              />
            </div>
          </div>
          <div class="variation-group">
            <h4>Tints <span class="variation-hint">(+ White)</span></h4>
            <div class="variation-colors">
              <div
                v-for="(tint, index) in tints"
                :key="tint"
                class="variation-color"
                :style="{ backgroundColor: tint }"
                @click="copyToClipboard(tint)"
                :title="tint"
              />
            </div>
          </div>
          <div class="variation-group">
            <h4>Tones <span class="variation-hint">(+ Gray)</span></h4>
            <div class="variation-colors">
              <div
                v-for="(tone, index) in tones"
                :key="tone"
                class="variation-color"
                :style="{ backgroundColor: tone }"
                @click="copyToClipboard(tone)"
                :title="tone"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.color-picker-modal {
  min-width: 480px;
  max-width: 540px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
}

/* Tab Navigation */
.tab-navigation {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  border-bottom: 1px solid var(--border-color);
}

.tab-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  font-size: 14px;
  font-weight: 500;
  color: var(--font-color-2);
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-button:hover {
  color: var(--font-color-1);
}

.tab-button.active {
  color: var(--purple);
  border-bottom-color: var(--purple);
}

.tab-button svg {
  opacity: 0.7;
}

.tab-button.active svg {
  opacity: 1;
}

.tab-content {
  animation: fadeIn 0.2s ease;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-right: 4px;
}

.tab-content::-webkit-scrollbar {
  width: 6px;
}

.tab-content::-webkit-scrollbar-track {
  background: transparent;
}

.tab-content::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.tab-content::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

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

.start-button,
.analyze-button {
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

.start-button:hover:not(:disabled),
.analyze-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
}

.start-button:active:not(:disabled),
.analyze-button:active:not(:disabled) {
  transform: translateY(0);
}

.start-button:disabled,
.analyze-button:disabled {
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
  color: var(--font-color-3);
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

/* Analysis Results */
.analysis-results {
  max-height: 500px;
  overflow-y: auto;
  padding-right: 4px;
}

.analysis-results::-webkit-scrollbar {
  width: 6px;
}

.analysis-results::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 3px;
}

.analysis-section {
  margin-bottom: 24px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--font-color-1);
}

.count-badge {
  display: inline-block;
  padding: 2px 8px;
  background: var(--card-bg-hover);
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  color: var(--font-color-2);
}

/* Top Colors Grid */
.color-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
}

.color-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 8px;
  background: var(--card-bg-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.color-card:hover {
  background: var(--card-bg-hover);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.color-preview {
  width: 100%;
  height: 50px;
  border-radius: 6px;
  box-shadow: inset 0 0 0 1px rgba(0,0,0,0.1);
}

.color-details {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  width: 100%;
}

.color-hex-small {
  font-size: 11px;
  font-weight: 600;
  font-family: 'SF Mono', Monaco, monospace;
  color: var(--font-color-1);
}

.color-usage {
  font-size: 10px;
  color: var(--font-color-2);
}

/* Distribution Bars */
.distribution-bars {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  background: var(--card-bg-color);
  border-radius: 8px;
}

.distribution-bar {
  display: flex;
  align-items: center;
  gap: 10px;
}

.bar-label {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100px;
  flex-shrink: 0;
}

.bar-color {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  box-shadow: inset 0 0 0 1px rgba(0,0,0,0.1);
  flex-shrink: 0;
}

.bar-hex {
  font-size: 11px;
  font-family: 'SF Mono', Monaco, monospace;
  color: var(--font-color-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bar-container {
  flex: 1;
  height: 20px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 10px;
  overflow: hidden;
  position: relative;
}

.bar-fill {
  height: 100%;
  border-radius: 10px;
  transition: width 0.3s ease;
  box-shadow: inset 0 0 0 1px rgba(0,0,0,0.1);
}

.bar-percentage {
  width: 45px;
  text-align: right;
  font-size: 11px;
  font-weight: 600;
  color: var(--font-color-2);
  flex-shrink: 0;
}

/* Color Chips */
.color-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.color-chip {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: var(--card-bg-color);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.color-chip:hover {
  background: var(--card-bg-hover);
  transform: translateY(-1px);
}

.chip-swatch {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  box-shadow: inset 0 0 0 1px rgba(0,0,0,0.1);
  flex-shrink: 0;
}

.chip-hex {
  font-size: 11px;
  font-weight: 500;
  font-family: 'SF Mono', Monaco, monospace;
  color: var(--font-color-1);
}

/* Tools Tab */
.tool-section {
  background: var(--card-bg-color);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
}

.tool-title {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--font-color-1);
}

.tool-description {
  margin: 0 0 16px 0;
  font-size: 13px;
  color: var(--font-color-2);
}

/* Contrast Checker */
.contrast-inputs {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.color-input-group {
  flex: 1;
}

.color-input-group label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--font-color-2);
  margin-bottom: 8px;
}

.color-input-wrapper {
  display: flex;
  gap: 8px;
  align-items: center;
}

.color-picker-input {
  width: 48px;
  height: 48px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  box-shadow: inset 0 0 0 1px rgba(0,0,0,0.1);
}

.color-text-input {
  flex: 1;
  padding: 10px 12px;
  background: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 13px;
  font-family: 'SF Mono', Monaco, monospace;
  color: var(--font-color-1);
  transition: all 0.2s ease;
}

.color-text-input:focus {
  outline: none;
  border-color: var(--purple);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.contrast-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
  border-radius: 10px;
  margin-bottom: 16px;
  box-shadow: inset 0 0 0 1px rgba(0,0,0,0.1);
}

.contrast-preview span {
  font-size: 24px;
  font-weight: 700;
  color: inherit;
}

.contrast-result {
  display: flex;
  gap: 16px;
  align-items: center;
}

.ratio-display {
  display: flex;
  align-items: baseline;
  gap: 4px;
  padding: 12px 20px;
  background: var(--bg-color);
  border-radius: 10px;
}

.ratio-value {
  font-size: 32px;
  font-weight: 800;
  color: var(--font-color-1);
  font-family: 'SF Mono', Monaco, monospace;
}

.ratio-label {
  font-size: 18px;
  font-weight: 600;
  color: var(--font-color-2);
}

.wcag-badges {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  flex: 1;
}

.wcag-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px;
  border-radius: 8px;
  background: var(--bg-color);
  border: 2px solid var(--border-color);
  transition: all 0.2s ease;
}

.wcag-badge.pass {
  border-color: #10b981;
  background: rgba(16, 185, 129, 0.05);
}

.wcag-badge.fail {
  border-color: #ef4444;
  background: rgba(239, 68, 68, 0.05);
}

.wcag-badge strong {
  font-size: 13px;
  font-weight: 700;
  color: var(--font-color-1);
  margin-bottom: 2px;
}

.wcag-badge span:nth-child(2) {
  font-size: 11px;
  color: var(--font-color-2);
  margin-bottom: 4px;
}

.badge-status {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
}

.wcag-badge.pass .badge-status {
  color: #10b981;
  background: rgba(16, 185, 129, 0.1);
}

.wcag-badge.fail .badge-status {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
}

/* Color Variations */
.variation-input {
  margin-bottom: 20px;
}

.variation-input label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--font-color-2);
  margin-bottom: 8px;
}

.variations {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.variation-group h4 {
  margin: 0 0 8px 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--font-color-1);
}

.variation-hint {
  font-size: 11px;
  font-weight: 400;
  color: var(--font-color-3);
}

.variation-colors {
  display: flex;
  gap: 6px;
}

.variation-color {
  flex: 1;
  height: 48px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: inset 0 0 0 1px rgba(0,0,0,0.1);
}

.variation-color:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.variation-base {
  border: 3px solid var(--purple);
  box-shadow: 0 0 0 1px rgba(0,0,0,0.1), 0 0 0 4px rgba(102, 126, 234, 0.2);
}
</style>
