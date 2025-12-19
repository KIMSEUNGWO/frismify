import type { VideoConverter, DownloadOptions } from '../types';
import { MessageType } from '@/core/InstanceManager';
import { MessageBus } from '@/core/MessageBus';

/**
 * Parsed M3U8 structure from background
 */
interface ParsedM3U8 {
  segments: string[];
  audioSegments: string[];
  videoSegments: string[];
  hasAudioTrack: boolean;
  hasVideoTrack: boolean;
  audioPlaylistUrl?: string;
  videoPlaylistUrl?: string;
}

/**
 * HLS (HTTP Live Streaming) Converter
 *
 * .m3u8 플레이리스트를 파싱하고 .ts 세그먼트를 다운로드하여 병합
 * Audio/Video 분리 스트림도 지원
 */
export class HLSConverter implements VideoConverter {
  id = 'hls';
  name = 'HLS Stream';
  description = 'Download HLS (.m3u8) streams and convert to .ts file';

  private messageBus = MessageBus.getInstance();

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

      // 1. M3U8 파싱
      const parsed = await this.getSegmentUrlList(url);
      console.log('[HLSConverter] Parsed M3U8:', parsed);

      // Audio/Video 분리 스트림인 경우 처리
      if (parsed.hasAudioTrack && parsed.hasVideoTrack &&
          (parsed.audioPlaylistUrl || parsed.videoPlaylistUrl)) {
        // 분리된 Audio/Video 스트림 다운로드
        await this.downloadSeparatedStreams(parsed, options);
        return;
      }

      const segmentUrlList = parsed.segments || [];

      if (segmentUrlList.length === 0) {
        throw new Error('No segments found in M3U8 playlist');
      }

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

  private async getSegmentUrlList(m3u8Url: string): Promise<ParsedM3U8> {
    const response = await this.messageBus.send(
      MessageType.GET_SEGMENT_URL_LIST,
      { m3u8Url }
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch segment list');
    }

    return response.data;
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
    const response = await this.messageBus.send(
      MessageType.DOWNLOAD_SEGMENT,
      { segmentUrl }
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to download segment');
    }

    // base64 → ArrayBuffer 변환
    const binary = atob(response.data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    return bytes.buffer;
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

  /**
   * Download separated audio/video streams
   */
  private async downloadSeparatedStreams(parsed: ParsedM3U8, options: DownloadOptions): Promise<void> {
    const { onProgress, concurrency = 2 } = options;

    try {
      onProgress?.({
        status: 'Detected separated streams...',
        percent: 5,
        details: 'Audio and video tracks are separated',
      });

      // 1. Audio playlist 다운로드
      let audioSegments: string[] = [];
      if (parsed.audioPlaylistUrl) {
        onProgress?.({
          status: 'Fetching audio playlist...',
          percent: 10,
          details: 'Parsing audio m3u8',
        });

        const audioParsed = await this.getSegmentUrlList(parsed.audioPlaylistUrl);
        audioSegments = audioParsed.segments || [];
        console.log('[HLSConverter] Audio segments:', audioSegments.length);
      }

      // 2. Video playlist 다운로드
      let videoSegments: string[] = [];
      if (parsed.videoPlaylistUrl) {
        onProgress?.({
          status: 'Fetching video playlist...',
          percent: 15,
          details: 'Parsing video m3u8',
        });

        const videoParsed = await this.getSegmentUrlList(parsed.videoPlaylistUrl);
        videoSegments = videoParsed.segments || [];
        console.log('[HLSConverter] Video segments:', videoSegments.length);
      }

      const totalSegments = audioSegments.length + videoSegments.length;

      // 3. Audio segments 다운로드
      let audioBuffers: ArrayBuffer[] = [];
      if (audioSegments.length > 0) {
        onProgress?.({
          status: 'Downloading audio...',
          percent: 20,
          details: `0/${audioSegments.length} audio segments`,
        });

        audioBuffers = await this.downloadSegmentsParallel(
          audioSegments,
          concurrency,
          (current, total) => {
            const percent = 20 + Math.floor((current / total) * 30);
            onProgress?.({
              status: 'Downloading audio...',
              percent,
              details: `${current}/${total} audio segments`,
            });
          }
        );
      }

      // 4. Video segments 다운로드
      let videoBuffers: ArrayBuffer[] = [];
      if (videoSegments.length > 0) {
        onProgress?.({
          status: 'Downloading video...',
          percent: 50,
          details: `0/${videoSegments.length} video segments`,
        });

        videoBuffers = await this.downloadSegmentsParallel(
          videoSegments,
          concurrency,
          (current, total) => {
            const percent = 50 + Math.floor((current / total) * 35);
            onProgress?.({
              status: 'Downloading video...',
              percent,
              details: `${current}/${total} video segments`,
            });
          }
        );
      }

      onProgress?.({
        status: 'Merging tracks...',
        percent: 90,
        details: 'Creating merged file',
      });

      // 5. Simple merge: Audio + Video segments를 순차적으로 병합
      // 주의: 이는 진짜 muxing이 아니라 단순 concatenation입니다
      // 대부분의 플레이어에서 재생 가능하지만, 완벽하지 않을 수 있습니다
      const allBuffers = [...audioBuffers, ...videoBuffers];
      const totalLength = allBuffers.reduce((sum, buffer) => sum + buffer.byteLength, 0);
      const mergedArray = new Uint8Array(totalLength);
      let offset = 0;
      for (const buffer of allBuffers) {
        mergedArray.set(new Uint8Array(buffer), offset);
        offset += buffer.byteLength;
      }

      // 6. 파일 다운로드
      const blob = new Blob([mergedArray], { type: 'video/mp2t' });
      const downloadUrl = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `video-merged-${Date.now()}.ts`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      onProgress?.({
        status: 'Complete!',
        percent: 100,
        details: 'Merged video downloaded (Note: This is a simple merge, not proper muxing)',
      });
    } catch (error) {
      console.error('[HLSConverter] Separated stream download failed:', error);
      throw error;
    }
  }

}