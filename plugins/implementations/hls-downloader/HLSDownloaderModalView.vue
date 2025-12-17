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
            <p class="stream-label">{{ item.type === 'mp4' ? 'MP4 File' : 'M3U8 Stream' }}</p>
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
    <div v-if="m3u8List.length > 0 && m3u8List.some(item => item.type === 'm3u8')" class="concurrency-section">
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
import {Browser} from "@wxt-dev/browser";

interface DownloadProgress {
  status: string;
  percent: number;
  details: string;
}

interface VideoItem {
  url: string;
  type: 'mp4' | 'm3u8';
}

const m3u8List = ref<VideoItem[]>([]);
const isDownloading = ref(false);
const downloadProgress = ref<DownloadProgress | null>(null);
const concurrency = ref<number>(2); // 동시 다운로드 스레드 수 (default: 2)

// Port 기반 통신을 위한 Port 인스턴스
let segmentFetchPort: Browser.runtime.Port | null = null;
const pendingSegmentRequests = new Map<string, {
  resolve: (data: string[]) => void;
  reject: (error: Error) => void;
}>();

// Segment 다운로드 요청 관리
const pendingSegmentDownloads = new Map<string, {
  resolve: (data: ArrayBuffer) => void;
  reject: (error: Error) => void;
}>();

onMounted(async () => {
  // Request m3u8 list from background (이미 캐싱된 데이터)
  const response = await browser.runtime.sendMessage({
    type: MessageType.GET_M3U8_LIST,
  });

  if (response.success) {
    m3u8List.value = response.data;
  }

  // Port 연결 (Segment Fetch용)
  segmentFetchPort = browser.runtime.connect({ name: "segment-fetch" });

  // Port 메시지 리스너
  segmentFetchPort.onMessage.addListener((message:any) => {
    // Segment URL List 결과
    if (message.type === MessageType.GET_SEGMENT_URL_LIST_RESULT) {
      const firstRequest = pendingSegmentRequests.values().next().value;
      if (firstRequest) {
        if (message.success && message.data) {
          firstRequest.resolve(message.data);
        } else {
          firstRequest.reject(new Error(message.error || 'Failed to fetch segment list'));
        }
        const firstKey = pendingSegmentRequests.keys().next().value;
        if (firstKey) {
          pendingSegmentRequests.delete(firstKey);
        }
      }
    }

    // Segment 다운로드 결과
    if (message.type === MessageType.DOWNLOAD_SEGMENT_RESULT) {
      const firstDownload = pendingSegmentDownloads.values().next().value;
      if (firstDownload) {
        if (message.success && message.data) {
          // base64 → ArrayBuffer 변환
          const binary = atob(message.data);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          firstDownload.resolve(bytes.buffer);
        } else {
          firstDownload.reject(new Error(message.error || 'Failed to download segment'));
        }
        const firstKey = pendingSegmentDownloads.keys().next().value;
        if (firstKey) {
          pendingSegmentDownloads.delete(firstKey);
        }
      }
    }
  });

  segmentFetchPort.onDisconnect.addListener(() => {
    console.log('[Modal] Segment fetch port disconnected');
    segmentFetchPort = null;
  });
});

onUnmounted(() => {
  // Port 연결 해제
  if (segmentFetchPort) {
    segmentFetchPort.disconnect();
    segmentFetchPort = null;
  }
  // pending requests 모두 reject
  pendingSegmentRequests.forEach(({ reject }) => {
    reject(new Error('Modal closed'));
  });
  pendingSegmentRequests.clear();
});

const getSegmentUrlList = async (m3u8Url: string): Promise<string[]> => {
  if (!segmentFetchPort) {
    throw new Error('Port not connected');
  }

  return new Promise<string[]>((resolve, reject) => {
    const requestId = crypto.randomUUID();
    pendingSegmentRequests.set(requestId, { resolve, reject });

    // Port를 통해 메시지 전송 (tabId는 Background에서 처리)
    segmentFetchPort!.postMessage({
      type: MessageType.GET_SEGMENT_URL_LIST,
      m3u8Url: m3u8Url,
    });

    // 타임아웃 설정 (30초)
    setTimeout(() => {
      if (pendingSegmentRequests.has(requestId)) {
        reject(new Error('Request timeout'));
        pendingSegmentRequests.delete(requestId);
      }
    }, 30000);
  });
}

const truncateUrl = (url: string): string => {
  if (url.length <= 60) return url;
  const start = url.substring(0, 20);
  const end = url.substring(url.length - 37);
  return `${start}...${end}`;
};

/**
 * Segment URL 검증
 * .m3u8로 끝나는 경우 실제 segment가 아니라 playlist이므로 다운로드 불가
 */
const validateSegments = (segments: string[]): { valid: boolean; error?: string } => {
  if (segments.length === 0) {
    return { valid: false, error: 'No segments found' };
  }

  // .m3u8로 끝나는 segment가 있는지 확인
  const hasM3u8 = segments.some(url => url.toLowerCase().endsWith('.m3u8'));
  if (hasM3u8) {
    return {
      valid: false,
      error: 'Master playlist detected (.m3u8). Please select a specific quality stream.'
    };
  }

  // .ts 또는 .m4s로 끝나는지 확인
  const validExtensions = ['.ts', '.m4s'];
  const hasValidSegment = segments.some(url =>
    validExtensions.some(ext => url.toLowerCase().endsWith(ext))
  );

  if (!hasValidSegment) {
    return {
      valid: false,
      error: 'No valid segments found (.ts or .m4s)'
    };
  }

  return { valid: true };
};

/**
 * Port 기반 Segment 다운로드 (단일)
 */
const downloadSegment = async (segmentUrl: string): Promise<ArrayBuffer> => {
  if (!segmentFetchPort) {
    throw new Error('Port not connected');
  }

  return new Promise<ArrayBuffer>((resolve, reject) => {
    const requestId = crypto.randomUUID();
    pendingSegmentDownloads.set(requestId, { resolve, reject });

    segmentFetchPort!.postMessage({
      type: MessageType.DOWNLOAD_SEGMENT,
      segmentUrl: segmentUrl,
    });

    // 타임아웃 설정 (60초 - segment는 크기가 클 수 있음)
    setTimeout(() => {
      if (pendingSegmentDownloads.has(requestId)) {
        reject(new Error('Segment download timeout'));
        pendingSegmentDownloads.delete(requestId);
      }
    }, 60000);
  });
};

/**
 * 병렬 다운로드 with concurrency control
 * @param segmentUrls - 다운로드할 segment URL 목록
 * @param concurrency - 동시 다운로드 수 (1-4)
 * @param onProgress - 진행 상황 콜백
 */
const downloadSegmentsParallel = async (
  segmentUrls: string[],
  concurrency: number = 2,
  onProgress?: (current: number, total: number) => void
): Promise<ArrayBuffer[]> => {
  const total = segmentUrls.length;
  const results: ArrayBuffer[] = new Array(total);
  let completed = 0;

  // Concurrency control using queue
  const queue: number[] = [...Array(total).keys()];
  const workers: Promise<void>[] = [];

  for (let i = 0; i < Math.min(concurrency, total); i++) {
    const worker = (async () => {
      while (queue.length > 0) {
        const index = queue.shift()!;
        const segmentUrl = segmentUrls[index];

        try {
          const buffer = await downloadSegment(segmentUrl);
          results[index] = buffer;
          completed++;
          onProgress?.(completed, total);
        } catch (error) {
          console.error(`Failed to download segment ${index}:`, error);
          throw error;
        }
      }
    })();

    workers.push(worker);
  }

  await Promise.all(workers);
  return results;
};

const downloadStream = async (item: VideoItem) => {
  if (isDownloading.value) return;

  isDownloading.value = true;

  try {
    // MP4 파일인 경우 직접 다운로드
    if (item.type === 'mp4') {
      downloadProgress.value = {
        status: 'Downloading MP4...',
        percent: 0,
        details: 'Starting download',
      };

      // browser.downloads API 사용하여 직접 다운로드
      await browser.runtime.sendMessage({
        type: MessageType.DOWNLOAD_IMAGE,
        url: item.url,
        filename: `video-${Date.now()}.mp4`,
      });

      downloadProgress.value = {
        status: 'Complete!',
        percent: 100,
        details: 'MP4 downloaded successfully',
      };

      setTimeout(() => {
        downloadProgress.value = null;
        isDownloading.value = false;
      }, 2000);
      return;
    }

    // M3U8 스트리밍인 경우 segment 다운로드
    downloadProgress.value = {
      status: 'Fetching segment list...',
      percent: 0,
      details: 'Parsing m3u8 playlist',
    };

    // 1. Segment URL 리스트 가져오기
    const segmentUrlList = await getSegmentUrlList(item.url);
    console.log('Segment URL List:', segmentUrlList);

    downloadProgress.value = {
      status: 'Validating segments...',
      percent: 10,
      details: `Found ${segmentUrlList.length} segments`,
    };

    // 2. Segment 검증
    const validation = validateSegments(segmentUrlList);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // 3. Segment 다운로드 (병렬, 사용자가 설정한 concurrency 사용)
    const segmentBuffers = await downloadSegmentsParallel(
      segmentUrlList,
      concurrency.value,
      (current, total) => {
        const percent = 10 + Math.floor((current / total) * 80);
        downloadProgress.value = {
          status: 'Downloading segments...',
          percent,
          details: `${current}/${total} segments`, // 예: 43/140
        };
      }
    );

    downloadProgress.value = {
      status: 'Merging segments...',
      percent: 95,
      details: 'Creating video file',
    };

    // 4. Segments 병합
    const totalLength = segmentBuffers.reduce((sum, buffer) => sum + buffer.byteLength, 0);
    const mergedArray = new Uint8Array(totalLength);
    let offset = 0;
    for (const buffer of segmentBuffers) {
      mergedArray.set(new Uint8Array(buffer), offset);
      offset += buffer.byteLength;
    }

    // 5. Blob 생성 및 다운로드
    const blob = new Blob([mergedArray], { type: 'video/mp2t' }); // .ts 파일
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `video-${Date.now()}.ts`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    downloadProgress.value = {
      status: 'Complete!',
      percent: 100,
      details: 'Video downloaded successfully',
    };

    setTimeout(() => {
      downloadProgress.value = null;
      isDownloading.value = false;
    }, 3000);

  } catch (error) {
    console.error('Download failed:', error);
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