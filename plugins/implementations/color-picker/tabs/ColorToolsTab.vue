<template>
  <div>
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
                @focus="handleInputFocus"
                @blur="handleInputBlur"
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
                @focus="handleInputFocus"
                @blur="handleInputBlur"
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
              @focus="handleInputFocus"
              @blur="handleInputBlur"
          />
        </div>
      </div>

      <div class="variations">
        <div class="variation-group">
          <h4>Shades <span class="variation-hint">(+ Black)</span></h4>
          <div class="variation-colors">
            <div
                v-for="shade in shades"
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
                v-for="tint in tints"
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
                v-for="tone in tones"
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
</template>

<script setup lang="ts">
import { checkWCAG, generateShades, generateTints, generateTones } from '@/plugins/implementations/color-picker/colorUtils';
import {useColorPicker} from "@/plugins/implementations/color-picker/useColorPicker";

const { copyToClipboard } = useColorPicker();
// Tools tab state
const contrastColor1 = ref('#000000');
const contrastColor2 = ref('#FFFFFF');
const selectedColorForVariations = ref<string>('#667eea');

// Contrast ratio computed
const contrastResult = computed(() => {
  return checkWCAG(contrastColor1.value, contrastColor2.value);
});

// Color variations computed
const shades = computed(() => generateShades(selectedColorForVariations.value, 5));
const tints = computed(() => generateTints(selectedColorForVariations.value, 5));
const tones = computed(() => generateTones(selectedColorForVariations.value, 5));

// Prevent other event listeners when input is focused
const handleInputKeyEvent = (event: KeyboardEvent) => {
  // Stop all keyboard events from propagating to page
  event.stopPropagation();
  event.stopImmediatePropagation();
};

const handleInputFocus = (event: FocusEvent) => {
  const input = event.target as HTMLInputElement;

  // Add event listeners to block all keyboard events
  input.addEventListener('keydown', handleInputKeyEvent, true);
  input.addEventListener('keyup', handleInputKeyEvent, true);
  input.addEventListener('keypress', handleInputKeyEvent, true);
};

const handleInputBlur = (event: FocusEvent) => {
  const input = event.target as HTMLInputElement;

  // Remove event listeners when unfocused
  input.removeEventListener('keydown', handleInputKeyEvent, true);
  input.removeEventListener('keyup', handleInputKeyEvent, true);
  input.removeEventListener('keypress', handleInputKeyEvent, true);
};

</script>


<style scoped>

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
  background: var(--bg-dark);
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
  background: var(--bg-dark);
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
  background: var(--bg-dark);
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
  color: var(--font-color-2);
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