/**
 * BackgroundFetchService
 *
 * Background Script에서 실행되는 fetch 서비스
 * - CORS 우회: Background는 host_permissions가 있어 CORS 제한 없음
 * - M3U8 파싱
 * - HLS Segment 다운로드
 */

export interface ParsedM3U8 {
  segments: string[];
  duration?: number;
}

export class BackgroundFetchService {
  private static instance: BackgroundFetchService;

  private constructor() {}

  public static getInstance(): BackgroundFetchService {
    if (!BackgroundFetchService.instance) {
      BackgroundFetchService.instance = new BackgroundFetchService();
    }
    return BackgroundFetchService.instance;
  }

  /**
   * M3U8 파일을 파싱하여 세그먼트 URL 목록 반환
   */
  public async parseM3U8(m3u8Url: string): Promise<ParsedM3U8> {
    try {
      const response = await fetch(m3u8Url);
      if (!response.ok) {
        throw new Error(`Failed to fetch M3U8: ${response.status} ${response.statusText}`);
      }

      const text = await response.text();
      const lines = text.split('\n').map(line => line.trim());

      // HTTP(S)로 시작하는 절대 URL만 추출
      const segments = lines.filter(line =>
        line.startsWith('http://') || line.startsWith('https://')
      );

      // 상대 경로 처리 (필요한 경우)
      const baseUrl = new URL(m3u8Url);
      const resolvedSegments = lines
        .filter(line =>
          line.length > 0 &&
          !line.startsWith('#') &&
          !line.startsWith('http')
        )
        .map(line => new URL(line, baseUrl.origin + baseUrl.pathname.substring(0, baseUrl.pathname.lastIndexOf('/') + 1)).href);

      const allSegments = [...segments, ...resolvedSegments];

      if (allSegments.length === 0) {
        throw new Error('No segments found in M3U8 file');
      }

      return {
        segments: allSegments,
        duration: this.calculateDuration(text),
      };
    } catch (error) {
      console.error('❌ Failed to parse M3U8:', error);
      throw error;
    }
  }

  /**
   * M3U8에서 총 재생 시간 계산 (EXTINF 태그 합산)
   */
  private calculateDuration(m3u8Text: string): number | undefined {
    const lines = m3u8Text.split('\n');
    let totalDuration = 0;

    for (const line of lines) {
      if (line.startsWith('#EXTINF:')) {
        const match = line.match(/#EXTINF:([\d.]+)/);
        if (match) {
          totalDuration += parseFloat(match[1]);
        }
      }
    }

    return totalDuration > 0 ? totalDuration : undefined;
  }

  /**
   * HLS 세그먼트 다운로드 (ArrayBuffer 반환)
   */
  public async downloadSegment(segmentUrl: string): Promise<ArrayBuffer> {
    try {
      const response = await fetch(segmentUrl);
      if (!response.ok) {
        throw new Error(`Failed to download segment: ${response.status} ${response.statusText}`);
      }

      return await response.arrayBuffer();
    } catch (error) {
      console.error('❌ Failed to download segment:', error);
      throw error;
    }
  }

  /**
   * 여러 세그먼트를 병렬로 다운로드
   * @param segmentUrls 세그먼트 URL 배열
   * @param onProgress 진행 상황 콜백
   * @param concurrency 동시 다운로드 개수 (기본값: 5)
   */
  public async downloadSegmentsBatch(
    segmentUrls: string[],
    onProgress?: (downloaded: number, total: number) => void,
    concurrency: number = 5
  ): Promise<ArrayBuffer[]> {
    const results: ArrayBuffer[] = new Array(segmentUrls.length);
    let completed = 0;

    // 청크 단위로 처리
    for (let i = 0; i < segmentUrls.length; i += concurrency) {
      const chunk = segmentUrls.slice(i, i + concurrency);
      const chunkResults = await Promise.all(
        chunk.map(async (url, idx) => {
          try {
            const buffer = await this.downloadSegment(url);
            completed++;
            onProgress?.(completed, segmentUrls.length);
            return { index: i + idx, buffer };
          } catch (error) {
            console.error(`Failed to download segment ${i + idx}:`, error);
            throw error;
          }
        })
      );

      // 결과를 올바른 인덱스에 배치
      chunkResults.forEach(({ index, buffer }) => {
        results[index] = buffer;
      });
    }

    return results;
  }
}
