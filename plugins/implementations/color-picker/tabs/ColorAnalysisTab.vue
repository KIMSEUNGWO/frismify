<template>
    <div>
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
</template>

<script setup lang="ts">
import {usePageColorAnalyzer} from "@/plugins/implementations/color-picker/usePageColorAnalyzer";
import {ref} from "vue";
import {useColorPicker} from "@/plugins/implementations/color-picker/useColorPicker";

const { isAnalyzing, analysis, analyze} = usePageColorAnalyzer();
const { copyToClipboard } = useColorPicker();

const copiedColor = ref<string | null>(null);

// Top colors (상위 10개만)
const topColors = computed(() => {
  if (!analysis.value) return [];
  return analysis.value.allColors.slice(0, 10);
});

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
</script>


<style scoped>
.actions {
  margin-bottom: 16px;
}

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

.analyze-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
}

.analyze-button:active:not(:disabled) {
  transform: translateY(0);
}

.analyze-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
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
</style>