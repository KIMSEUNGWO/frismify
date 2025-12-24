import type { BackgroundMonitorModalPlugin } from '@/types';
import {MessageType} from "@/core/InstanceManager";

interface M3U8Data {
  url: string;
  content: string;
  timestamp: number;
  recordMode?: boolean; // Record 모드 플래그
  segments?: SegmentData[]; // 수집된 세그먼트
  expectedSegments?: number; // 예상 세그먼트 수
}

interface SegmentData {
  url: string;
  data: ArrayBuffer;
  index: number;
}

// 감지된 비디오 파일을 탭별로 저장하는 Map (TabId -> VideoItem[])
interface VideoItem {
  url: string;
  type: 'hls' | 'mp4' | 'dash' | 'unknown';
}

const detectedM3u8Map = new Map<number, VideoItem[]>();

// Record 모드 활성화 여부 (m3u8Url -> boolean)
const recordModeMap = new Map<string, boolean>();

// webRequest 리스너 참조 (cleanup을 위해 저장)
let webRequestListener: ((details: any) => undefined) | null = null;
let tabRemovedListener: ((tabId: number) => void) | null = null;

export const hlsDownloader: BackgroundMonitorModalPlugin = {
  id: 'hls-downloader',
  name: 'HLS Downloader',
  description: 'Download and convert HLS (m3u8) streams to MP4',
  category: 'utility',
  tier: 'free',
  version: '1.0.0',
  isModal: true,

  icon: (container) => {
    container.style.background = 'var(--plugin-hls-downloader)';
    container.className += ' plugin-icon';
    container.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C12.5523 2 13 2.44772 13 3V13.5858L16.2929 10.2929C16.6834 9.90237 17.3166 9.90237 17.7071 10.2929C18.0976 10.6834 18.0976 11.3166 17.7071 11.7071L12.7071 16.7071C12.3166 17.0976 11.6834 17.0976 11.2929 16.7071L6.29289 11.7071C5.90237 11.3166 5.90237 10.6834 6.29289 10.2929C6.68342 9.90237 7.31658 9.90237 7.70711 10.2929L11 13.5858V3C11 2.44772 11.4477 2 12 2Z" fill="white"/>
      <path d="M3 14C3.55228 14 4 14.4477 4 15V19C4 19.5523 4.44772 20 5 20H19C19.5523 20 20 19.5523 20 19V15C20 14.4477 20.4477 14 21 14C21.5523 14 22 14.4477 22 15V19C22 20.6569 20.6569 22 19 22H5C3.34315 22 2 20.6569 2 19V15C2 14.4477 2.44772 14 3 14Z" fill="white"/>
    </svg>`;
  },

  // Background에서 활성화 시 호출
  onBackgroundActivate: async () => {
    console.log('[HLS Downloader] Background monitoring activated');

    // 기존 리스너가 있으면 제거 (중복 등록 방지)
    if (webRequestListener) {
      browser.webRequest.onBeforeRequest.removeListener(webRequestListener);
      console.log('[HLS Downloader] Removed existing webRequest listener');
    }
    if (tabRemovedListener) {
      browser.tabs.onRemoved.removeListener(tabRemovedListener);
      console.log('[HLS Downloader] Removed existing tab listener');
    }

    // webRequest 리스너 등록 (onBeforeRequest로 변경하여 캐시에서도 감지)
    webRequestListener = (details) => {
      const url = details.url;
      const tabId = details.tabId;

      // tabId가 -1인 경우 (service worker 등) 무시
      if (tabId === -1) return undefined;

      const existingList = detectedM3u8Map.get(tabId) || [];

      // mp4 파일 감지
      if (url.includes('.mp4')) {
        console.log('[HLS Downloader] Detected mp4:', url);

        // 중복 체크
        const alreadyExists = existingList.some(item => item.url === url);
        if (alreadyExists) {
          return undefined;
        }

        // URL이 너무 짧으면 무시 (광고, 썸네일 등)
        if (url.length < 50) {
          return undefined;
        }

        if (!detectedM3u8Map.has(tabId)) {
          detectedM3u8Map.set(tabId, []);
        }
        detectedM3u8Map.get(tabId)!.push({ url, type: 'mp4' });
        return undefined;
      }

      // m3u8 파일 감지 (HLS)
      if (url.includes('.m3u8')) {
        console.log('[HLS Downloader] Detected m3u8:', url);

        // 중복 체크
        const alreadyExists = existingList.some(item => item.url === url);
        if (alreadyExists) {
          console.log('[HLS Downloader] m3u8 already cached:', url);
          return undefined;
        }

        // master.m3u8 필터링 (URL 기반)
        // playlist.m3u8는 품질별 실제 segment 리스트이므로 포함해야 함
        // const urlLower = url.toLowerCase();
        // if (urlLower.includes('master.m3u8')) {
        //   console.log('[HLS Downloader] Skipping master playlist:', url);
        //   return undefined;
        // }

        if (!detectedM3u8Map.has(tabId)) {
          detectedM3u8Map.set(tabId, []);
        }
        detectedM3u8Map.get(tabId)!.push({ url, type: 'hls' });
        return undefined;
      }

      // mpd 파일 감지 (DASH)
      if (url.includes('.mpd')) {
        console.log('[HLS Downloader] Detected mpd (DASH):', url);

        // 중복 체크
        const alreadyExists = existingList.some(item => item.url === url);
        if (alreadyExists) {
          console.log('[HLS Downloader] mpd already cached:', url);
          return undefined;
        }

        if (!detectedM3u8Map.has(tabId)) {
          detectedM3u8Map.set(tabId, []);
        }
        detectedM3u8Map.get(tabId)!.push({ url, type: 'dash' });
        return undefined;
      }

      return undefined;
    };

    // onBeforeRequest로 변경 (캐시에서 로드되는 경우에도 감지)
    browser.webRequest.onBeforeRequest.addListener(
      webRequestListener,
      { urls: ['<all_urls>'] }
    );

    // Tab 닫힐 때 해당 탭의 m3u8 목록 삭제
    tabRemovedListener = (tabId) => {
      detectedM3u8Map.delete(tabId);
    };

    browser.tabs.onRemoved.addListener(tabRemovedListener);
  },

  // Background에서 비활성화 시 호출
  onBackgroundCleanup: async () => {
    console.log('[HLS Downloader] Background monitoring cleaned up');

    // webRequest 리스너 제거
    if (webRequestListener) {
      browser.webRequest.onBeforeRequest.removeListener(webRequestListener);
      webRequestListener = null;
    }

    // Tab 리스너 제거
    if (tabRemovedListener) {
      browser.tabs.onRemoved.removeListener(tabRemovedListener);
      tabRemovedListener = null;
    }

    // 감지된 URL 맵 초기화
    detectedM3u8Map.clear();
  },

  onOpen: async (_ctx) => {
    console.log('📹 HLS Downloader modal opened');
  },

  onClose: async () => {
    console.log('📹 HLS Downloader modal closed');
  },
};

// M3U8 맵을 export (MessageType.GET_M3U8_LIST에서 사용)
export { detectedM3u8Map };