<script setup lang="ts">
import { ref } from 'vue';
import ColorBlindnessTab from './tabs/ColorBlindnessTab.vue';

const activeTab = ref<'colorblindness' | 'network' | 'screen-reader' | 'keyboard'>('colorblindness');

const switchTab = (tab: 'colorblindness' | 'network' | 'screen-reader' | 'keyboard') => {
  activeTab.value = tab;
};
</script>

<template>
  <div class="accessibility-modal">
    <!-- Tab Navigation -->
    <div class="tab-navigation">
      <button
        class="tab-button"
        :class="{ active: activeTab === 'colorblindness' }"
        @click="switchTab('colorblindness')"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="2"/>
          <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
        </svg>
        Color Blindness
      </button>
      <button
        class="tab-button"
        :class="{ active: activeTab === 'network' }"
        @click="switchTab('network')"
        disabled
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2v20M2 12h20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
        </svg>
        Network Speed
      </button>
      <button
        class="tab-button"
        :class="{ active: activeTab === 'screen-reader' }"
        @click="switchTab('screen-reader')"
        disabled
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="currentColor" stroke-width="2"/>
          <polyline points="9 22 9 12 15 12 15 22" stroke="currentColor" stroke-width="2"/>
        </svg>
        Screen Reader
      </button>
      <button
        class="tab-button"
        :class="{ active: activeTab === 'keyboard' }"
        @click="switchTab('keyboard')"
        disabled
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="6" width="20" height="12" rx="2" stroke="currentColor" stroke-width="2"/>
          <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        Keyboard Nav
      </button>
    </div>

    <!-- Tab Content -->
    <ColorBlindnessTab v-if="activeTab === 'colorblindness'" class="tab-content" />

    <!-- Placeholder for future tabs -->
    <div v-else class="tab-content coming-soon">
      <div class="coming-soon-content">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
          <path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <h3>Coming Soon</h3>
        <p>This feature is under development</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.accessibility-modal {
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
  overflow-x: auto;
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
  white-space: nowrap;
}

.tab-button:hover:not(:disabled) {
  color: var(--font-color-1);
}

.tab-button.active {
  color: var(--purple);
  border-bottom-color: var(--purple);
}

.tab-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
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

/* Coming Soon */
.coming-soon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.coming-soon-content {
  text-align: center;
  padding: 48px 24px;
  color: var(--font-color-2);
}

.coming-soon-content svg {
  margin-bottom: 16px;
  opacity: 0.5;
}

.coming-soon-content h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--font-color-1);
}

.coming-soon-content p {
  margin: 0;
  font-size: 14px;
  color: var(--font-color-2);
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
</style>