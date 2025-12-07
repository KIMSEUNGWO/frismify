<script setup lang="ts">
  import {onMounted, onUnmounted, ref} from 'vue';
import ColorPickerTab from "@/plugins/implementations/color-picker/tabs/ColorPickerTab.vue";
import ColorAnalysisTab from "@/plugins/implementations/color-picker/tabs/ColorAnalysisTab.vue";
import ColorToolsTab from "@/plugins/implementations/color-picker/tabs/ColorToolsTab.vue";

const activeTab = ref<'picker' | 'analysis' | 'tools'>('picker');
const colorPickerRef = ref<typeof ColorPickerTab | null>(null);

const props = defineProps({
  isFold: {
    type: Boolean,
    required: true
  }
});
const emit = defineEmits<{
  'disabledFold': [],
}>();


const switchTab = (tab: 'picker' | 'analysis' | 'tools') => {
  activeTab.value = tab;
};
const getTab = () => activeTab.value;


const handleStartPicking = async () => {
  if (activeTab.value !== 'picker') {
    switchTab('picker');
  }
  await nextTick();
  colorPickerRef.value?.handleStartBtn();
};

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

    <ColorPickerTab v-if="activeTab === 'picker'" class="tab-content"
                    ref="colorPickerRef"
                    @switchTab="switchTab"
                    @getTab="getTab"
    />

    <ColorAnalysisTab v-else-if="activeTab === 'analysis'" class="tab-content"
    />

    <ColorToolsTab v-else-if="activeTab === 'tools'" class="tab-content"
    />
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

</style>
