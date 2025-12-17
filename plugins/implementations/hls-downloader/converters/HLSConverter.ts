import type { VideoConverter, DownloadOptions } from '../types';
import { MessageType } from '@/core/InstanceManager';
import type { Browser } from '@wxt-dev/browser';

/**
 * HLS (HTTP Live Streaming) Converter
 *
 * .m3u8 플레이리스트를 파싱하고 .ts 세그먼트를 다운로드하여 병합
 */
export class HLSConverter implements VideoConverter {
  id = 'hls';
  name = 'HLS Stream';
  description = 'Download HLS (.m3u8) streams and convert to .ts file';

  private segmentFetchPort: Browser.runtime.Port | null = null;
  private pendingSegmentRequests = new Map<string, {
    resolve: (data: string[]) => void;
    reject: (error: Error) => void;
  }>();
  private pendingSegmentDownloads = new Map<string, {
    resolve: (data: ArrayBuffer) => void;
    reject: (error: Error) => void;
  }>();

  constructor(port: Browser.runtime.Port) {
    this.segmentFetchPort = port;
    this.setupMessageListener();
  }

  private setupMessageListener() {
    if (!this.segmentFetchPort) return;

    this.segmentFetchPort.onMessage.addListener((message: any) => {
      // Segment URL List 결과
      if (message.type === MessageType.GET_SEGMENT_URL_LIST_RESULT) {
        const firstRequest = this.pendingSegmentRequests.values().next().value;
        if (firstRequest) {
          if (message.success && message.data) {
            firstRequest.resolve(message.data);
          } else {
            firstRequest.reject(new Error(message.error || 'Failed to fetch segment list'));
          }
          const firstKey = this.pendingSegmentRequests.keys().next().value;
          if (firstKey) {
            this.pendingSegmentRequests.delete(firstKey);
          }
        }
      }

      // Segment 다운로드 결과
      if (message.type === MessageType.DOWNLOAD_SEGMENT_RESULT) {
        const firstDownload = this.pendingSegmentDownloads.values().next().value;
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
          const firstKey = this.pendingSegmentDownloads.keys().next().value;
          if (firstKey) {
            this.pendingSegmentDownloads.delete(firstKey);
          }
        }
      }
    });
  }

  canHandle(url: string): boolean {
    return url.toLowerCase().includes('.m3u8');
  }

  async download(url: string, options: DownloadOptions): Promise<void> {
    const { onProgress, concurrency = 2, filename } = options;

    try {
      onProgress?.({
        status: 'Fetching segment list...',
        percent: 0,
        details: 'Parsing m3u8 playlist',
      });

      // 1. Segment URL 리스트 가져오기
      const segmentUrlList = await this.getSegmentUrlList(url);
      console.log('[HLSConverter] Segment URL List:', segmentUrlList);

      onProgress?.({
        status: 'Validating segments...',
        percent: 10,
        details: `Found ${segmentUrlList.length} segments`,
      });

      // 2. Segment 검증
      const validation = this.validateSegments(segmentUrlList);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // 3. Segment 다운로드 (병렬)
      const segmentBuffers = await this.downloadSegmentsParallel(
        segmentUrlList,
        concurrency,
        (current, total) => {
          const percent = 10 + Math.floor((current / total) * 80);
          onProgress?.({
            status: 'Downloading segments...',
            percent,
            details: `${current}/${total} segments`,
          });
        }
      );

      onProgress?.({
        status: 'Merging segments...',
        percent: 95,
        details: 'Creating video file',
      });

      // 4. Segments 병합
      const totalLength = segmentBuffers.reduce((sum, buffer) => sum + buffer.byteLength, 0);
      const mergedArray = new Uint8Array(totalLength);
      let offset = 0;
      for (const buffer of segmentBuffers) {
        mergedArray.set(new Uint8Array(buffer), offset);
        offset += buffer.byteLength;
      }

      // 5. Blob 생성 및 다운로드
      const blob = new Blob([mergedArray], { type: 'video/mp2t' });
      const downloadUrl = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename || `video-${Date.now()}.ts`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      onProgress?.({
        status: 'Complete!',
        percent: 100,
        details: 'Video downloaded successfully',
      });
    } catch (error) {
      console.error('[HLSConverter] Download failed:', error);
      throw error;
    }
  }

  private async getSegmentUrlList(m3u8Url: string): Promise<string[]> {
    if (!this.segmentFetchPort) {
      throw new Error('Port not connected');
    }

    return new Promise<string[]>((resolve, reject) => {
      const requestId = crypto.randomUUID();
      this.pendingSegmentRequests.set(requestId, { resolve, reject });

      this.segmentFetchPort!.postMessage({
        type: MessageType.GET_SEGMENT_URL_LIST,
        m3u8Url: m3u8Url,
      });

      // 타임아웃 설정 (30초)
      setTimeout(() => {
        if (this.pendingSegmentRequests.has(requestId)) {
          reject(new Error('Request timeout'));
          this.pendingSegmentRequests.delete(requestId);
        }
      }, 30000);
    });
  }

  private validateSegments(segments: string[]): { valid: boolean; error?: string } {
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
  }

  private async downloadSegment(segmentUrl: string): Promise<ArrayBuffer> {
    if (!this.segmentFetchPort) {
      throw new Error('Port not connected');
    }

    return new Promise<ArrayBuffer>((resolve, reject) => {
      const requestId = crypto.randomUUID();
      this.pendingSegmentDownloads.set(requestId, { resolve, reject });

      this.segmentFetchPort!.postMessage({
        type: MessageType.DOWNLOAD_SEGMENT,
        segmentUrl: segmentUrl,
      });

      // 타임아웃 설정 (60초)
      setTimeout(() => {
        if (this.pendingSegmentDownloads.has(requestId)) {
          reject(new Error('Segment download timeout'));
          this.pendingSegmentDownloads.delete(requestId);
        }
      }, 60000);
    });
  }

  private async downloadSegmentsParallel(
    segmentUrls: string[],
    concurrency: number,
    onProgress?: (current: number, total: number) => void
  ): Promise<ArrayBuffer[]> {
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
            const buffer = await this.downloadSegment(segmentUrl);
            results[index] = buffer;
            completed++;
            onProgress?.(completed, total);
          } catch (error) {
            console.error(`[HLSConverter] Failed to download segment ${index}:`, error);
            throw error;
          }
        }
      })();

      workers.push(worker);
    }

    await Promise.all(workers);
    return results;
  }

  cleanup() {
    this.pendingSegmentRequests.forEach(({ reject }) => {
      reject(new Error('Converter cleanup'));
    });
    this.pendingSegmentRequests.clear();
    this.pendingSegmentDownloads.clear();
  }
}