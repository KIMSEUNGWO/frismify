<template>
  <div class="hls-downloader-modal">
    <!-- M3U8 List -->
    <div v-if="m3u8List.length === 0" class="empty-state">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M7 10l5 5 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M12 15V3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <p class="empty-title">No HLS streams detected</p>
      <p class="empty-subtitle">Enable the plugin and navigate to a page with HLS video</p>
    </div>

    <div v-else class="stream-list">
      <div v-for="(item, index) in m3u8List" :key="index" class="stream-item">
        <div class="stream-info">
          <div class="stream-icon" :class="{ 'mp4-icon': item.type === 'mp4' }">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="2"/>
              <polyline points="14 2 14 8 20 8" stroke="currentColor" stroke-width="2"/>
              <path d="M10 12l4 3-4 3v-6z" fill="currentColor"/>
            </svg>
          </div>
          <div class="stream-details">
            <p class="stream-url" :title="item.url">{{ truncateUrl(item.url) }}</p>
            <p class="stream-label">{{ getTypeLabel(item.type) }}</p>
          </div>
        </div>
        <button
          class="download-button"
          @click="downloadStream(item)"
          :disabled="isDownloading"
        >
          <svg v-if="!isDownloading" width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M7 10l5 5 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M12 15V3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <div v-else class="spinner"></div>
          {{ isDownloading ? 'Downloading...' : 'Download' }}
        </button>
      </div>
    </div>

    <!-- Concurrency Control -->
    <div v-if="m3u8List.length > 0 && m3u8List.some(item => item.type === 'hls')" class="concurrency-section">
      <div class="concurrency-header">
        <span class="concurrency-label">Download Threads</span>
        <span class="concurrency-value">{{ concurrency }}</span>
      </div>
      <div class="concurrency-buttons">
        <button
          v-for="num in [1, 2, 3, 4]"
          :key="num"
          class="concurrency-button"
          :class="{ active: concurrency === num }"
          @click="concurrency = num"
          :disabled="isDownloading"
        >
          {{ num }}
        </button>
      </div>
    </div>

    <!-- Progress Section -->
    <div v-if="downloadProgress" class="progress-section">
      <div class="progress-header">
        <span class="progress-title">{{ downloadProgress.status }}</span>
        <span class="progress-percentage">{{ downloadProgress.percent }}%</span>
      </div>
      <div class="progress-bar-container">
        <div class="progress-bar" :style="{ width: downloadProgress.percent + '%' }"></div>
      </div>
      <p class="progress-details">{{ downloadProgress.details }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { MessageType } from '@/core/InstanceManager';
import { Browser } from "@wxt-dev/browser";
import type { VideoItem, DownloadProgress, VideoConverter } from './types';
import { HLSConverter, MP4Converter, DASHConverter } from './converters';

const m3u8List = ref<VideoItem[]>([]);
const isDownloading = ref(false);
const downloadProgress = ref<DownloadProgress | null>(null);
const concurrency = ref<number>(2); // 동시 다운로드 스레드 수 (default: 2)

// Video Converters
let hlsConverter: HLSConverter | null = null;
let mp4Converter: MP4Converter | null = null;
let dashConverter: DASHConverter | null = null;
const converters: VideoConverter[] = [];

onMounted(async () => {
  // Request video list from background
  const response = await browser.runtime.sendMessage({
    type: MessageType.GET_M3U8_LIST,
  });

  if (response.success) {
    m3u8List.value = response.data;
  }

  // Initialize converters
  const port = browser.runtime.connect({ name: "segment-fetch" });
  hlsConverter = new HLSConverter(port);
  mp4Converter = new MP4Converter();
  dashConverter = new DASHConverter();

  // Store converters in array for easy iteration
  converters.push(hlsConverter, mp4Converter, dashConverter);
});

onUnmounted(() => {
  // Cleanup all converters
  converters.forEach(converter => {
    if (converter.cleanup) {
      converter.cleanup();
    }
  });
});

const truncateUrl = (url: string): string => {
  if (url.length <= 60) return url;
  const start = url.substring(0, 20);
  const end = url.substring(url.length - 37);
  return `${start}...${end}`;
};

/**
 * Get type label for display
 */
const getTypeLabel = (type: VideoItem['type']): string => {
  switch (type) {
    case 'mp4':
      return 'MP4 File';
    case 'hls':
      return 'HLS Stream';
    case 'dash':
      return 'DASH Stream';
    default:
      return 'Unknown';
  }
};

/**
 * Download video using appropriate converter
 */
const downloadStream = async (item: VideoItem) => {
  if (isDownloading.value) return;

  isDownloading.value = true;

  try {
    // Find appropriate converter for this video
    const converter = converters.find(c => c.canHandle(item.url));

    if (!converter) {
      throw new Error(`No converter found for ${item.type} type`);
    }

    console.log(`[Modal] Using ${converter.name} for ${item.url}`);

    // Download using converter
    await converter.download(item.url, {
      concurrency: concurrency.value,
      onProgress: (progress) => {
        downloadProgress.value = progress;
      },
    });

    setTimeout(() => {
      downloadProgress.value = null;
      isDownloading.value = false;
    }, 2000);

  } catch (error) {
    console.error('[Modal] Download failed:', error);
    downloadProgress.value = {
      status: 'Failed',
      percent: 0,
      details: String(error),
    };

    setTimeout(() => {
      downloadProgress.value = null;
      isDownloading.value = false;
    }, 5000);
  }
};
</script>

<style scoped>
.hls-downloader-modal {
  min-width: 520px;
  max-width: 600px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  gap: 12px;
}

.empty-state svg {
  color: var(--font-color-2);
  opacity: 0.4;
}

.empty-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--font-color-1);
  margin: 0;
}

.empty-subtitle {
  font-size: 13px;
  color: var(--font-color-2);
  margin: 0;
  max-width: 320px;
}

.stream-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 400px;
  overflow-y: auto;
}

.stream-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px;
  background: var(--card-bg-color);
  border-radius: 10px;
  transition: all 0.2s ease;
  gap: 12px;
}

.stream-item:hover {
  background: var(--card-bg-hover);
}

.stream-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.stream-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #3B82F6, #8B5CF6);
  border-radius: 10px;
  color: #fff;
}

.stream-details {
  flex: 1;
  min-width: 0;
}

.stream-url {
  font-size: 13px;
  font-weight: 600;
  color: var(--font-color-1);
  margin: 0 0 4px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stream-label {
  font-size: 11px;
  color: var(--font-color-2);
  margin: 0;
}

.download-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  background: linear-gradient(135deg, #3B82F6, #8B5CF6);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.download-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.download-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.progress-section {
  padding: 16px;
  background: var(--card-bg-color);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.progress-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--font-color-1);
}

.progress-percentage {
  font-size: 14px;
  font-weight: 700;
  color: var(--purple);
}

.progress-bar-container {
  width: 100%;
  height: 8px;
  background: rgba(139, 92, 246, 0.1);
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #3B82F6, #8B5CF6);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-details {
  font-size: 12px;
  color: var(--font-color-2);
  margin: 0;
}

.concurrency-section {
  padding: 14px 16px;
  background: var(--card-bg-color);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.concurrency-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.concurrency-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--font-color-1);
}

.concurrency-value {
  font-size: 13px;
  font-weight: 700;
  color: var(--purple);
  min-width: 20px;
  text-align: center;
}

.concurrency-buttons {
  display: flex;
  gap: 8px;
}

.concurrency-button {
  flex: 1;
  padding: 8px;
  background: var(--card-bg-color);
  border: 2px solid var(--border-color);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--font-color-2);
  cursor: pointer;
  transition: all 0.2s ease;
}

.concurrency-button:hover:not(:disabled) {
  border-color: var(--purple);
  color: var(--font-color-1);
}

.concurrency-button.active {
  background: linear-gradient(135deg, #3B82F6, #8B5CF6);
  border-color: transparent;
  color: #fff;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

.concurrency-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>