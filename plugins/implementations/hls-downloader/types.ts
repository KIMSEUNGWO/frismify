/**
 * Video Downloader Types
 *
 * 다양한 스트리밍 기술(HLS, DASH, MP4 등)을 지원하는 범용 비디오 다운로더
 */

export interface DownloadProgress {
  status: string;
  percent: number;
  details: string;
}

export interface DownloadOptions {
  onProgress?: (progress: DownloadProgress) => void;
  concurrency?: number; // 병렬 다운로드 스레드 수 (1-4)
  filename?: string; // 다운로드 파일명
}

/**
 * VideoConverter Interface
 *
 * 각 스트리밍 기술별로 구현해야 하는 인터페이스
 * - HLSConverter: HLS (.m3u8) 스트림 다운로드
 * - MP4Converter: MP4 직접 다운로드
 * - DASHConverter: DASH (.mpd) 스트림 다운로드
 */
export interface VideoConverter {
  /** Converter 고유 ID */
  id: string;

  /** Converter 이름 (UI 표시용) */
  name: string;

  /** Converter 설명 */
  description: string;

  /**
   * 주어진 URL을 이 Converter가 처리할 수 있는지 판단
   * @param url - 비디오 URL
   * @returns true면 이 Converter로 처리 가능
   */
  canHandle(url: string): boolean;

  /**
   * 비디오 다운로드 실행
   * @param url - 비디오 URL
   * @param options - 다운로드 옵션
   */
  download(url: string, options: DownloadOptions): Promise<void>;

  /**
   * Converter cleanup (선택사항)
   * 컴포넌트 unmount 시 호출되어 리소스를 정리합니다.
   */
  cleanup?(): void;
}

/**
 * 감지된 비디오 아이템
 */
export interface VideoItem {
  url: string;
  type: 'hls' | 'mp4' | 'dash' | 'youtube' | 'unknown';
  detectedAt?: number; // 감지된 시간 (timestamp)
}