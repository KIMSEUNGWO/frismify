import type { VideoConverter, DownloadOptions } from '../types';
import { MessageType } from '@/core/InstanceManager';

/**
 * MP4 Converter
 *
 * MP4 파일을 직접 다운로드 (변환 불필요)
 */
export class MP4Converter implements VideoConverter {
  id = 'mp4';
  name = 'MP4 File';
  description = 'Direct download MP4 files';

  canHandle(url: string): boolean {
    return url.toLowerCase().includes('.mp4');
  }

  async download(url: string, options: DownloadOptions): Promise<void> {
    const { onProgress, filename } = options;

    try {
      onProgress?.({
        status: 'Downloading MP4...',
        percent: 0,
        details: 'Starting download',
      });

      // browser.downloads API 사용하여 직접 다운로드
      await browser.runtime.sendMessage({
        type: MessageType.DOWNLOAD_IMAGE,
        url: url,
        filename: filename || `video-${Date.now()}.mp4`,
      });

      onProgress?.({
        status: 'Complete!',
        percent: 100,
        details: 'MP4 downloaded successfully',
      });
    } catch (error) {
      console.error('[MP4Converter] Download failed:', error);
      throw error;
    }
  }

  cleanup() {
    // No cleanup needed for MP4 direct download
  }
}