<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  simulateAllColorBlindness,
  COLOR_BLINDNESS_LABELS,
  type ColorBlindnessType
} from '../colorBlindnessUtils';

interface ColorElement {
  element: HTMLElement;
  originalColor: string;
  computedColor: string;
  type: 'text' | 'background' | 'border';
}

const isSimulating = ref(false);
const selectedType = ref<ColorBlindnessType>('protanopia');
const coloredElements = ref<ColorElement[]>([]);
const originalStyles = new Map<HTMLElement, { color?: string; backgroundColor?: string; borderColor?: string }>();
const mediaElements = ref<HTMLElement[]>([]);
const originalFilters = new Map<HTMLElement, string>();
let injectedStyleElement: HTMLStyleElement | null = null;
let mutationObserver: MutationObserver | null = null;

const simulationTypes: ColorBlindnessType[] = [
  'protanopia',
  'deuteranopia',
  'tritanopia',
  'achromatopsia',
  'protanomaly',
  'deuteranomaly',
  'tritanomaly',
];

const currentLabel = computed(() => COLOR_BLINDNESS_LABELS[selectedType.value]);

// CSS filter matrices for different color blindness types
// These SVG filters provide more accurate simulation for images/videos
const getColorBlindnessFilter = (type: ColorBlindnessType): string => {
  const filters: Record<ColorBlindnessType, string> = {
    // Protanopia (Red-Blind)
    protanopia: `
      <svg xmlns="http://www.w3.org/2000/svg">
        <filter id="protanopia">
          <feColorMatrix type="matrix" values="0.567, 0.433, 0,     0, 0
                                                 0.558, 0.442, 0,     0, 0
                                                 0,     0.242, 0.758, 0, 0
                                                 0,     0,     0,     1, 0"/>
        </filter>
      </svg>
    `,
    // Deuteranopia (Green-Blind)
    deuteranopia: `
      <svg xmlns="http://www.w3.org/2000/svg">
        <filter id="deuteranopia">
          <feColorMatrix type="matrix" values="0.625, 0.375, 0,   0, 0
                                                 0.7,   0.3,   0,   0, 0
                                                 0,     0.3,   0.7, 0, 0
                                                 0,     0,     0,   1, 0"/>
        </filter>
      </svg>
    `,
    // Tritanopia (Blue-Blind)
    tritanopia: `
      <svg xmlns="http://www.w3.org/2000/svg">
        <filter id="tritanopia">
          <feColorMatrix type="matrix" values="0.95, 0.05,  0,     0, 0
                                                 0,    0.433, 0.567, 0, 0
                                                 0,    0.475, 0.525, 0, 0
                                                 0,    0,     0,     1, 0"/>
        </filter>
      </svg>
    `,
    // Achromatopsia (Total Color Blindness - Grayscale)
    achromatopsia: `
      <svg xmlns="http://www.w3.org/2000/svg">
        <filter id="achromatopsia">
          <feColorMatrix type="matrix" values="0.299, 0.587, 0.114, 0, 0
                                                 0.299, 0.587, 0.114, 0, 0
                                                 0.299, 0.587, 0.114, 0, 0
                                                 0,     0,     0,     1, 0"/>
        </filter>
      </svg>
    `,
    // Protanomaly (Red-Weak)
    protanomaly: `
      <svg xmlns="http://www.w3.org/2000/svg">
        <filter id="protanomaly">
          <feColorMatrix type="matrix" values="0.817, 0.183, 0,     0, 0
                                                 0.333, 0.667, 0,     0, 0
                                                 0,     0.125, 0.875, 0, 0
                                                 0,     0,     0,     1, 0"/>
        </filter>
      </svg>
    `,
    // Deuteranomaly (Green-Weak)
    deuteranomaly: `
      <svg xmlns="http://www.w3.org/2000/svg">
        <filter id="deuteranomaly">
          <feColorMatrix type="matrix" values="0.8,   0.2,   0,     0, 0
                                                 0.258, 0.742, 0,     0, 0
                                                 0,     0.142, 0.858, 0, 0
                                                 0,     0,     0,     1, 0"/>
        </filter>
      </svg>
    `,
    // Tritanomaly (Blue-Weak)
    tritanomaly: `
      <svg xmlns="http://www.w3.org/2000/svg">
        <filter id="tritanomaly">
          <feColorMatrix type="matrix" values="0.967, 0.033, 0,     0, 0
                                                 0,     0.733, 0.267, 0, 0
                                                 0,     0.183, 0.817, 0, 0
                                                 0,     0,     0,     1, 0"/>
        </filter>
      </svg>
    `,
  };

  return filters[type];
};

// Scan for media elements (images, videos, canvases)
const scanMediaElements = () => {
  mediaElements.value = [];
  const foundElements = new Set<HTMLElement>();

  // 1. Find all img, video, canvas, svg elements
  const images = document.querySelectorAll('img, video, canvas, svg, picture, iframe');
  images.forEach((el) => {
    const htmlEl = el as HTMLElement;
    const styles = window.getComputedStyle(htmlEl);

    // Skip invisible elements
    if (styles.display === 'none' || styles.visibility === 'hidden' || styles.opacity === '0') {
      return;
    }

    foundElements.add(htmlEl);
  });

  // 2. Find elements with background images
  const allElements = document.querySelectorAll('*');
  allElements.forEach((el) => {
    const htmlEl = el as HTMLElement;
    const styles = window.getComputedStyle(htmlEl);

    // Skip invisible elements
    if (styles.display === 'none' || styles.visibility === 'hidden' || styles.opacity === '0') {
      return;
    }

    if (styles.backgroundImage && styles.backgroundImage !== 'none') {
      foundElements.add(htmlEl);
    }
  });

  // 3. Find SVG images and nested elements
  const svgs = document.querySelectorAll('svg, svg *');
  svgs.forEach((el) => {
    const htmlEl = el as HTMLElement;
    const styles = window.getComputedStyle(htmlEl);

    if (styles.display === 'none' || styles.visibility === 'hidden' || styles.opacity === '0') {
      return;
    }

    foundElements.add(htmlEl);
  });

  // 4. Find picture elements and their sources
  const pictures = document.querySelectorAll('picture');
  pictures.forEach((picture) => {
    const sources = picture.querySelectorAll('source, img');
    sources.forEach((el) => {
      const htmlEl = el as HTMLElement;
      foundElements.add(htmlEl);
    });
    foundElements.add(picture as HTMLElement);
  });

  mediaElements.value = Array.from(foundElements);
  console.log(`[Accessibility] Found ${mediaElements.value.length} media elements`);
};

// Extract all colored elements from the page
const scanPageColors = () => {
  coloredElements.value = [];
  const elements = document.querySelectorAll('*');

  elements.forEach((el) => {
    const htmlEl = el as HTMLElement;
    const styles = window.getComputedStyle(htmlEl);

    // Skip invisible elements
    if (styles.display === 'none' || styles.visibility === 'hidden' || styles.opacity === '0') {
      return;
    }

    // Check text color
    const color = styles.color;
    if (color && color !== 'rgba(0, 0, 0, 0)') {
      coloredElements.value.push({
        element: htmlEl,
        originalColor: color,
        computedColor: color,
        type: 'text',
      });
    }

    // Check background color
    const bgColor = styles.backgroundColor;
    if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)') {
      coloredElements.value.push({
        element: htmlEl,
        originalColor: bgColor,
        computedColor: bgColor,
        type: 'background',
      });
    }

    // Check border color
    const borderColor = styles.borderColor;
    if (borderColor && borderColor !== 'rgba(0, 0, 0, 0)') {
      coloredElements.value.push({
        element: htmlEl,
        originalColor: borderColor,
        computedColor: borderColor,
        type: 'border',
      });
    }
  });

  console.log(`[Accessibility] Found ${coloredElements.value.length} colored elements`);
};

// Convert RGB string to HEX
const rgbToHex = (rgb: string): string => {
  const match = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return '#000000';

  const r = parseInt(match[1]);
  const g = parseInt(match[2]);
  const b = parseInt(match[3]);

  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
};

// Inject CSS to apply filters to pseudo-elements (::before, ::after)
const injectPseudoElementStyles = () => {
  const filterSVG = getColorBlindnessFilter(selectedType.value);
  const filterDataURL = `data:image/svg+xml;base64,${btoa(filterSVG)}`;

  // Create style element if it doesn't exist
  if (!injectedStyleElement) {
    injectedStyleElement = document.createElement('style');
    injectedStyleElement.id = 'prismify-accessibility-pseudo-filter';
    document.head.appendChild(injectedStyleElement);
  }

  // Inject CSS rules for pseudo-elements
  const css = `
    *::before,
    *::after {
      filter: url("${filterDataURL}#${selectedType.value}") !important;
    }
  `;

  injectedStyleElement.textContent = css;
  console.log('[Accessibility] Injected pseudo-element filter styles');
};

// Remove injected pseudo-element styles
const removePseudoElementStyles = () => {
  if (injectedStyleElement && injectedStyleElement.parentNode) {
    injectedStyleElement.parentNode.removeChild(injectedStyleElement);
    injectedStyleElement = null;
    console.log('[Accessibility] Removed pseudo-element filter styles');
  }
};

// Apply CSS filter to media elements (images, videos)
const applyMediaFilters = () => {
  const filterSVG = getColorBlindnessFilter(selectedType.value);
  const filterDataURL = `data:image/svg+xml;base64,${btoa(filterSVG)}`;

  mediaElements.value.forEach((element) => {
    // Store original filter
    if (!originalFilters.has(element)) {
      const current = window.getComputedStyle(element);
      originalFilters.set(element, current.filter);
    }

    // Apply color blindness filter
    try {
      // Use SVG filter via Data URL
      element.style.filter = `url("${filterDataURL}#${selectedType.value}")`;

      // Add setProperty as fallback for better compatibility
      element.style.setProperty('filter', `url("${filterDataURL}#${selectedType.value}")`, 'important');
    } catch (error) {
      console.error('[Accessibility] Failed to apply media filter:', error);

      // Fallback: For achromatopsia, use simple grayscale
      if (selectedType.value === 'achromatopsia') {
        try {
          element.style.filter = 'grayscale(100%)';
        } catch (e) {
          // Silently fail
        }
      }
    }
  });

  // Also apply filters to pseudo-elements
  injectPseudoElementStyles();
};

// Remove CSS filters from media elements
const removeMediaFilters = () => {
  originalFilters.forEach((filter, element) => {
    try {
      element.style.filter = filter === 'none' ? '' : filter;
    } catch (error) {
      console.error('[Accessibility] Failed to restore media filter:', error);
    }
  });

  originalFilters.clear();
  mediaElements.value = [];
};

// Apply filter to a single element
const applyFilterToElement = (element: HTMLElement) => {
  const filterSVG = getColorBlindnessFilter(selectedType.value);
  const filterDataURL = `data:image/svg+xml;base64,${btoa(filterSVG)}`;

  // Store original filter if not already stored
  if (!originalFilters.has(element)) {
    const current = window.getComputedStyle(element);
    originalFilters.set(element, current.filter);
  }

  // Apply filter
  try {
    element.style.setProperty('filter', `url("${filterDataURL}#${selectedType.value}")`, 'important');
  } catch (error) {
    console.error('[Accessibility] Failed to apply filter to element:', error);
  }
};

// Start observing DOM changes for dynamically added images
const startObservingDOM = () => {
  if (mutationObserver) {
    mutationObserver.disconnect();
  }

  mutationObserver = new MutationObserver((mutations) => {
    if (!isSimulating.value) return;

    mutations.forEach((mutation) => {
      // Check added nodes
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType !== Node.ELEMENT_NODE) return;

        const element = node as HTMLElement;

        // Check if it's an image element
        if (element.tagName === 'IMG' || element.tagName === 'VIDEO' || element.tagName === 'CANVAS' || element.tagName === 'SVG') {
          console.log('[Accessibility] New media element detected:', element.tagName);
          applyFilterToElement(element);
          if (!mediaElements.value.includes(element)) {
            mediaElements.value.push(element);
          }
        }

        // Check for background images in the new element
        const styles = window.getComputedStyle(element);
        if (styles.backgroundImage && styles.backgroundImage !== 'none') {
          console.log('[Accessibility] New background image detected');
          applyFilterToElement(element);
          if (!mediaElements.value.includes(element)) {
            mediaElements.value.push(element);
          }
        }

        // Check descendants for images
        const imgs = element.querySelectorAll('img, video, canvas, svg');
        imgs.forEach((img) => {
          const htmlEl = img as HTMLElement;
          console.log('[Accessibility] New descendant media element detected:', img.tagName);
          applyFilterToElement(htmlEl);
          if (!mediaElements.value.includes(htmlEl)) {
            mediaElements.value.push(htmlEl);
          }
        });
      });
    });
  });

  // Start observing
  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });

  console.log('[Accessibility] Started observing DOM for new images');
};

// Stop observing DOM changes
const stopObservingDOM = () => {
  if (mutationObserver) {
    mutationObserver.disconnect();
    mutationObserver = null;
    console.log('[Accessibility] Stopped observing DOM');
  }
};

// Start color blindness simulation
const startSimulation = () => {
  if (isSimulating.value) {
    stopSimulation();
    return;
  }

  isSimulating.value = true;
  scanPageColors();
  scanMediaElements();
  applySimulation();
  applyMediaFilters();

  // Start observing for dynamically added images
  startObservingDOM();
};

// Apply color blindness simulation to page
const applySimulation = () => {
  coloredElements.value.forEach(({ element, originalColor, type }) => {
    // Store original styles
    if (!originalStyles.has(element)) {
      const current = window.getComputedStyle(element);
      originalStyles.set(element, {
        color: current.color,
        backgroundColor: current.backgroundColor,
        borderColor: current.borderColor,
      });
    }

    // Convert to hex and simulate
    const hex = rgbToHex(originalColor);
    const simulated = simulateAllColorBlindness(hex)[selectedType.value];

    // Apply simulated color
    try {
      if (type === 'text') {
        element.style.color = simulated;
      } else if (type === 'background') {
        element.style.backgroundColor = simulated;
      } else if (type === 'border') {
        element.style.borderColor = simulated;
      }
    } catch (error) {
      console.error('[Accessibility] Failed to apply color:', error);
    }
  });
};

// Stop simulation and restore original colors
const stopSimulation = () => {
  isSimulating.value = false;

  // Stop observing DOM changes
  stopObservingDOM();

  // Restore text/background/border colors
  originalStyles.forEach((styles, element) => {
    try {
      if (styles.color) element.style.color = styles.color;
      if (styles.backgroundColor) element.style.backgroundColor = styles.backgroundColor;
      if (styles.borderColor) element.style.borderColor = styles.borderColor;
    } catch (error) {
      console.error('[Accessibility] Failed to restore color:', error);
    }
  });

  // Restore media filters
  removeMediaFilters();

  // Remove pseudo-element styles
  removePseudoElementStyles();

  originalStyles.clear();
  coloredElements.value = [];
};

// Change simulation type
const changeType = (type: ColorBlindnessType) => {
  selectedType.value = type;
  if (isSimulating.value) {
    applySimulation();
    applyMediaFilters();
  }
};

// Cleanup on unmount
onMounted(() => {
  return () => {
    if (isSimulating.value) {
      stopSimulation();
    }
  };
});

onUnmounted(() => {
  if (isSimulating.value) {
    stopSimulation()
  }
})
</script>

<template>
  <div class="colorblindness-tab">
    <!-- Controls -->
    <div class="controls">
      <button
        class="simulate-button"
        :class="{ active: isSimulating }"
        @click="startSimulation"
      >
        <svg v-if="!isSimulating" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="2"/>
          <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
        </svg>
        <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 2L22 22" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <path d="M9 9a3 3 0 104.5 2.5" stroke="currentColor" stroke-width="2"/>
          <path d="M3 3l3 3m12 12l3 3M9.88 9.88A10.5 10.5 0 013 12M14.12 14.12A10.5 10.5 0 0121 12" stroke="currentColor" stroke-width="2"/>
        </svg>
        {{ isSimulating ? 'Stop Simulation' : 'Start Simulation' }}
      </button>
    </div>

    <!-- Type Selection -->
    <div class="type-selection">
      <h3>Color Blindness Type</h3>
      <div class="type-grid">
        <div
          v-for="type in simulationTypes"
          :key="type"
          class="type-card"
          :class="{ active: selectedType === type }"
          @click="changeType(type)"
        >
          <div class="type-header">
            <h4>{{ COLOR_BLINDNESS_LABELS[type].name }}</h4>
            <div v-if="selectedType === type" class="check-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
          </div>
          <p class="type-description">{{ COLOR_BLINDNESS_LABELS[type].description }}</p>
          <span class="type-prevalence">{{ COLOR_BLINDNESS_LABELS[type].prevalence }}</span>
        </div>
      </div>
    </div>

    <!-- Info Panel -->
    <div v-if="isSimulating" class="info-panel">
      <div class="info-header">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
          <path d="M12 16v-4M12 8h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <span>Simulation Active</span>
      </div>
      <p>
        Page is now showing how it appears to people with <strong>{{ currentLabel.name }}</strong> ({{ currentLabel.description }}).
      </p>
      <p class="info-note">
        Affecting {{ currentLabel.prevalence }} of the population. Test your design for color contrast and distinguishability.
      </p>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <div class="empty-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="2"/>
          <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
        </svg>
      </div>
      <p>Color Blindness Simulator</p>
      <span>Select a type and start simulation to see how people with color vision deficiency perceive this page</span>
    </div>
  </div>
</template>

<style scoped>
.colorblindness-tab {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Controls */
.controls {
  display: flex;
  gap: 12px;
}

.simulate-button {
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

.simulate-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
}

.simulate-button.active {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  box-shadow: 0 4px 14px rgba(239, 68, 68, 0.4);
}

.simulate-button.active:hover {
  box-shadow: 0 6px 20px rgba(239, 68, 68, 0.5);
}

/* Type Selection */
.type-selection h3 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--font-color-1);
}

.type-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.type-card {
  padding: 14px;
  background: var(--card-bg-color);
  border: 2px solid transparent;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.type-card:hover {
  background: var(--card-bg-hover);
  transform: translateY(-2px);
}

.type-card.active {
  border-color: var(--purple);
  background: var(--card-bg-hover);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
}

.type-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.type-header h4 {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--font-color-1);
}

.check-icon {
  color: var(--purple);
}

.type-description {
  margin: 0 0 6px 0;
  font-size: 12px;
  color: var(--font-color-2);
}

.type-prevalence {
  display: inline-block;
  padding: 2px 8px;
  background: rgba(102, 126, 234, 0.1);
  border-radius: 6px;
  font-size: 10px;
  font-weight: 600;
  color: var(--purple);
}

/* Info Panel */
.info-panel {
  padding: 16px;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
  border-radius: 10px;
  border: 1px solid rgba(102, 126, 234, 0.2);
}

.info-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-weight: 600;
  font-size: 13px;
  color: var(--purple);
}

.info-panel p {
  margin: 0 0 8px 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--font-color-1);
}

.info-note {
  font-size: 12px;
  color: var(--font-color-2);
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 32px 16px;
  color: #999;
}

.empty-icon {
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state p {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--font-color-1);
}

.empty-state span {
  font-size: 12px;
  line-height: 1.5;
  color: var(--font-color-2);
}
</style>