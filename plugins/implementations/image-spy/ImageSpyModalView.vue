<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useImageSpy, type ImageAsset } from './useImageSpy';

const { assets, isLoading, collectAssets, downloadAsset, downloadAll, filterByType } = useImageSpy();

const selectedFilter = ref<'all' | 'img' | 'svg' | 'background'>('all');
const searchQuery = ref('');

// 필터링된 assets
const filteredAssets = computed(() => {
  let filtered = filterByType(selectedFilter.value);

  // 검색어 필터링
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter((asset) =>
      asset.filename.toLowerCase().includes(query)
    );
  }

  return filtered;
});

// 타입별 카운트
const counts = computed(() => ({
  all: assets.value.length,
  img: assets.value.filter((a) => a.type === 'img').length,
  svg: assets.value.filter((a) => a.type === 'svg').length,
  background: assets.value.filter((a) => a.type === 'background').length,
}));

// 초기 로드
onMounted(() => {
  collectAssets();
});

const handleRefresh = () => {
  collectAssets();
};

const handleDownload = (asset: ImageAsset) => {
  downloadAsset(asset);
};

const handleDownloadAll = () => {
  if (filteredAssets.value.length === 0) return;

  const confirmMsg = `Download ${filteredAssets.value.length} images?`;
  if (confirm(confirmMsg)) {
    downloadAll();
  }
};

// Asset 타입 아이콘
const getTypeIcon = (type: string) => {
  switch (type) {
    case 'img':
      return '🖼️';
    case 'svg':
      return '📐';
    case 'background':
      return '🎨';
    default:
      return '📦';
  }
};
</script>

<template>
  <div class="image-spy-modal">
    <!-- Header -->
    <div class="header">
      <div class="header-info">
        <h2>Image Assets</h2>
        <span class="count-badge">{{ filteredAssets.length }} of {{ assets.length }}</span>
      </div>
      <button
        class="refresh-button"
        @click="handleRefresh"
        :disabled="isLoading"
        title="Refresh assets"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          :class="{ spinning: isLoading }"
        >
          <path
            d="M21 10C21 10 18.995 7.26822 17.3662 5.63824C15.7373 4.00827 13.4864 3 11 3C6.02944 3 2 7.02944 2 12C2 16.9706 6.02944 21 11 21C15.1031 21 18.5649 18.2543 19.6482 14.5"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path d="M21 3V10H14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>

    <!-- Search and Filters -->
    <div class="toolbar">
      <div class="search-bar">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/>
          <path d="M21 21L16.65 16.65" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search by filename..."
          class="search-input"
        />
      </div>

      <div class="filter-tabs">
        <button
          class="filter-tab"
          :class="{ active: selectedFilter === 'all' }"
          @click="selectedFilter = 'all'"
        >
          All ({{ counts.all }})
        </button>
        <button
          class="filter-tab"
          :class="{ active: selectedFilter === 'img' }"
          @click="selectedFilter = 'img'"
        >
          IMG ({{ counts.img }})
        </button>
        <button
          class="filter-tab"
          :class="{ active: selectedFilter === 'svg' }"
          @click="selectedFilter = 'svg'"
        >
          SVG ({{ counts.svg }})
        </button>
        <button
          class="filter-tab"
          :class="{ active: selectedFilter === 'background' }"
          @click="selectedFilter = 'background'"
        >
          BG ({{ counts.background }})
        </button>
      </div>
    </div>

    <!-- Asset Grid -->
    <div class="asset-grid" v-if="!isLoading && filteredAssets.length > 0">
      <div
        v-for="asset in filteredAssets"
        :key="asset.id"
        class="asset-card"
      >
        <div class="asset-thumbnail">
          <img :src="asset.thumbnail" :alt="asset.filename" />
          <div class="asset-overlay">
            <button
              class="download-button"
              @click="handleDownload(asset)"
              title="Download"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <polyline points="7 10 12 15 17 10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="asset-info">
          <div class="asset-type">
            <span class="type-icon">{{ getTypeIcon(asset.type) }}</span>
            <span class="type-label">{{ asset.type.toUpperCase() }}</span>
          </div>
          <div class="asset-filename" :title="asset.filename">{{ asset.filename }}</div>
          <div class="asset-size">{{ asset.width }} × {{ asset.height }}px</div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-else-if="isLoading" class="empty-state">
      <div class="spinner"></div>
      <p>Scanning page for images...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredAssets.length === 0" class="empty-state">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="1.5"/>
        <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
        <path d="M3 15L8 10L12 14L16 10L21 15V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V15Z" fill="currentColor" opacity="0.3"/>
      </svg>
      <p>No images found</p>
      <span>Try adjusting your filter settings</span>
    </div>

    <!-- Footer -->
    <div class="footer" v-if="filteredAssets.length > 0">
      <button
        class="download-all-button"
        @click="handleDownloadAll"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <polyline points="7 10 12 15 17 10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        Download All ({{ filteredAssets.length }})
      </button>
    </div>
  </div>
</template>

<style scoped>
.image-spy-modal {
  min-width: 600px;
  max-width: 800px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* Header */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  flex-shrink: 0;
}

.header-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-info h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--font-color-1);
}

.count-badge {
  display: inline-block;
  padding: 4px 10px;
  background: var(--card-bg-color);
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  color: var(--font-color-2);
}

.refresh-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: var(--card-bg-color);
  border: none;
  border-radius: 8px;
  color: var(--font-color-2);
  cursor: pointer;
  transition: all 0.2s ease;
}

.refresh-button:hover:not(:disabled) {
  background: var(--card-bg-hover);
  color: var(--purple);
}

.refresh-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Toolbar */
.toolbar {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
  flex-shrink: 0;
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: var(--card-bg-color);
  border-radius: 10px;
  border: 1px solid var(--border-color);
  transition: all 0.2s ease;
}

.search-bar:focus-within {
  border-color: var(--purple);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.search-bar svg {
  color: var(--font-color-3);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 14px;
  color: var(--font-color-1);
  outline: none;
}

.search-input::placeholder {
  color: var(--font-color-3);
}

.filter-tabs {
  display: flex;
  gap: 6px;
  padding: 4px;
  background: var(--card-bg-color);
  border-radius: 8px;
}

.filter-tab {
  flex: 1;
  padding: 8px 12px;
  background: transparent;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--font-color-2);
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-tab:hover {
  background: var(--card-bg-hover);
  color: var(--font-color-1);
}

.filter-tab.active {
  background: var(--purple);
  color: #fff;
  box-shadow: 0 2px 6px rgba(102, 126, 234, 0.3);
}

/* Asset Grid */
.asset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  grid-auto-rows: max-content;
  gap: 16px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 4px;
  align-content: start;
}

.asset-grid::-webkit-scrollbar {
  width: 6px;
}

.asset-grid::-webkit-scrollbar-track {
  background: transparent;
}

.asset-grid::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.asset-card {
  background: var(--card-bg-color);
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.2s ease;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  height: fit-content;
}

.asset-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
}

.asset-thumbnail {
  position: relative;
  width: 100%;
  height: 160px;
  background: var(--bg-color);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.asset-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.asset-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.asset-card:hover .asset-overlay {
  opacity: 1;
}

.download-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: var(--purple);
  border: none;
  border-radius: 50%;
  color: #fff;
  cursor: pointer;
  transition: all 0.2s ease;
}

.download-button:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.asset-info {
  padding: 12px;
}

.asset-type {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}

.type-icon {
  font-size: 14px;
}

.type-label {
  font-size: 10px;
  font-weight: 700;
  color: var(--font-color-3);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.asset-filename {
  font-size: 13px;
  font-weight: 600;
  color: var(--font-color-1);
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.asset-size {
  font-size: 11px;
  color: var(--font-color-3);
}

/* Empty State */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: var(--font-color-3);
  text-align: center;
}

.empty-state svg {
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state p {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--font-color-2);
}

.empty-state span {
  font-size: 13px;
  color: var(--font-color-3);
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid var(--border-color);
  border-top-color: var(--purple);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

/* Footer */
.footer {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
  flex-shrink: 0;
}

.download-all-button {
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

.download-all-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
}

.download-all-button:active {
  transform: translateY(0);
}
</style>
