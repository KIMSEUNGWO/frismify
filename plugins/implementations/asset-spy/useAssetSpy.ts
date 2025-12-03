import { ref } from 'vue';
import { getSetting } from '@/utils/settings';
import { MessageType } from '@/core/InstanceManager';

// ============================================================================
// 타입 정의
// ============================================================================

/**
 * Asset 인터페이스
 * 웹페이지에서 수집된 이미지 정보를 담는 객체
 */
export interface Asset {
  id: string;                          // 고유 식별자
  type: 'img' | 'svg' | 'background';  // Asset 타입 (IMG 태그 | SVG 요소 | CSS 배경)
  url: string;                         // 이미지 URL 또는 Data URL
  element: Element;                    // DOM 요소 참조
  width: number;                       // 이미지 너비 (px)
  height: number;                      // 이미지 높이 (px)
  filename: string;                    // 다운로드할 파일명 (확장자 포함)
  thumbnail: string;                   // 썸네일 URL (미리보기용)
}

// ============================================================================
// 상수
// ============================================================================

/** Fetch 요청 타임아웃 (30초) */
const FETCH_TIMEOUT_MS = 30000;

/** 일괄 다운로드 시 파일 간 딜레이 (브라우저 다운로드 제한 회피) */
const DOWNLOAD_DELAY_MS = 200;

/** Blob URL 정리 대기 시간 */
const BLOB_CLEANUP_DELAY_MS = 1000;

/** 지원하는 이미지 확장자 목록 */
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'] as const;

/** 이미지 확장자 정규식 */
const IMAGE_EXTENSION_REGEX = /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i;

/** 파일 시스템에서 허용되지 않는 문자 */
const INVALID_FILENAME_CHARS = /[<>:"/\\|?*]/g;

/** Background image URL 파싱 정규식 */
const BG_IMAGE_URL_REGEX = /url\(['"]?([^'"]+)['"]?\)/;

// ============================================================================
// Composable
// ============================================================================

/**
 * AssetSpy 플러그인 핵심 로직
 *
 * 기능:
 * - 웹페이지에서 이미지 수집 (IMG, SVG, CSS background-image)
 * - CORS 우회 다운로드 (Background Script 활용)
 * - 파일명 자동 추출 및 확장자 처리
 * - 일괄 다운로드
 *
 * @returns 이미지 수집 및 다운로드 기능을 제공하는 객체
 */
export function useAssetSpy() {
  const assets = ref<Asset[]>([]);
  const isLoading = ref(false);

  // ==========================================================================
  // 유틸리티 함수
  // ==========================================================================

  /**
   * SVG 요소를 Base64 Data URL로 변환
   *
   * SVG는 XML 형식이므로 XMLSerializer로 직렬화한 후 Base64 인코딩
   *
   * @param svg - 변환할 SVG 요소
   * @returns Base64 Data URL 또는 빈 문자열 (실패 시)
   * @example
   * const svg = document.querySelector('svg');
   * const dataUrl = svgToDataURL(svg); // "data:image/svg+xml;base64,..."
   */
  const svgToDataURL = (svg: SVGElement): string => {
    try {
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svg);

      // UTF-8 인코딩 후 Base64 변환
      const base64 = btoa(unescape(encodeURIComponent(svgString)));

      return `data:image/svg+xml;base64,${base64}`;
    } catch (error) {
      console.error('[AssetSpy] Failed to convert SVG to Data URL:', error);
      return '';
    }
  };

  /**
   * URL에서 파일명 추출
   *
   * 처리 과정:
   * 1. Query string 자동 제거 (URL 객체 사용)
   * 2. URL 디코딩 (한글 파일명 지원)
   * 3. 파일명이 없으면 호스트명 사용
   * 4. 파일 시스템 호환 문자로 변환
   *
   * @param url - 이미지 URL
   * @returns 추출된 파일명 (확장자 제외)
   * @example
   * getFilenameFromUrl('https://example.com/cat.jpg?w=500') // "cat"
   * getFilenameFromUrl('https://cdn.com/%ED%95%9C%EA%B8%80.png') // "한글"
   * getFilenameFromUrl('https://api.com/image/12345') // "12345"
   * getFilenameFromUrl('https://cdn.com/') // "cdn.com-image"
   */
  const getFilenameFromUrl = (url: string): string => {
    try {
      const urlObj = new URL(url, window.location.href);
      let pathname = urlObj.pathname;

      // 1. pathname에서 마지막 세그먼트 추출
      let filename = pathname.substring(pathname.lastIndexOf('/') + 1);

      // 2. URL 디코딩 (한글 파일명 처리)
      try {
        filename = decodeURIComponent(filename);
      } catch {
        // 디코딩 실패 시 원본 사용
      }

      // 3. 파일명이 없거나 너무 짧으면 pathname 전체에서 추출
      if (!filename || filename.length < 2) {
        const segments = pathname.split('/').filter(s => s.length > 0);
        if (segments.length > 0) {
          filename = segments[segments.length - 1];
          try {
            filename = decodeURIComponent(filename);
          } catch {
            // 디코딩 실패 시 원본 사용
          }
        }
      }

      // 4. 여전히 파일명이 없으면 호스트명 사용
      if (!filename || filename.length < 2) {
        const host = urlObj.hostname.replace(/^www\./, '');
        filename = `${host}-image`;
      }

      // 5. 파일 시스템에서 사용 불가능한 특수문자 제거
      filename = filename.replace(INVALID_FILENAME_CHARS, '-');

      return filename || 'image';
    } catch {
      return 'image';
    }
  };

  /**
   * 파일명에 확장자 추가 (없는 경우)
   *
   * 처리 순서:
   * 1. 파일명에 이미 확장자가 있는지 확인 → 있으면 그대로 반환
   * 2. URL pathname에서 확장자 추출 시도
   * 3. Asset 타입 또는 URL 내용에서 확장자 추론
   * 4. 모두 실패하면 기본 확장자 (.jpg) 사용
   *
   * @param filename - 원본 파일명
   * @param url - 이미지 URL
   * @param type - Asset 타입 (img | svg | background)
   * @returns 확장자가 포함된 파일명
   * @example
   * ensureExtension('photo', 'https://example.com/photo.png', 'img') // "photo.png"
   * ensureExtension('logo', 'https://cdn.com/logo', 'svg') // "logo.svg"
   * ensureExtension('image', 'https://api.com/image?id=123', 'img') // "image.jpg"
   */
  const ensureExtension = (filename: string, url: string, type?: string): string => {
    // 1. 이미 확장자가 있는지 확인
    if (IMAGE_EXTENSION_REGEX.test(filename)) {
      return filename;
    }

    let ext = '';

    // 2. URL pathname에서 확장자 추출 시도
    try {
      const urlObj = new URL(url, window.location.href);
      const pathname = urlObj.pathname;
      const match = pathname.match(IMAGE_EXTENSION_REGEX);
      if (match) {
        ext = match[0]; // '.png', '.jpg' 등
      }
    } catch {
      // URL 파싱 실패
    }

    // 3. Asset 타입 또는 URL 내용에서 확장자 추론
    if (!ext) {
      if (type === 'svg' || url.includes('svg')) {
        ext = '.svg';
      } else if (url.includes('png')) {
        ext = '.png';
      } else if (url.includes('jpg') || url.includes('jpeg')) {
        ext = '.jpg';
      } else if (url.includes('gif')) {
        ext = '.gif';
      } else if (url.includes('webp')) {
        ext = '.webp';
      } else {
        // 4. 기본 확장자
        ext = '.jpg';
      }
    }

    return filename + ext;
  };

  /**
   * Asset 고유 ID 생성
   *
   * URL을 Base64 인코딩한 후 일부를 사용하여 고유 ID 생성
   * 타입 프리픽스로 구분 (img-, svg-, background-)
   *
   * @param url - 이미지 URL
   * @param type - Asset 타입
   * @returns 고유 ID
   * @example
   * generateId('https://example.com/cat.jpg', 'img') // "img-aHR0cHM6Ly9leGF"
   */
  const generateId = (url: string, type: string): string => {
    return `${type}-${btoa(url).substring(0, 16)}`;
  };

  /**
   * 다운로드 링크 생성 및 클릭
   *
   * a 태그를 동적으로 생성하여 파일 다운로드 트리거
   * 다운로드 후 DOM에서 제거
   *
   * @param href - 다운로드할 URL (http:// 또는 blob: 프로토콜)
   * @param filename - 다운로드될 파일명
   */
  const createDownloadLink = (href: string, filename: string): void => {
    const link = document.createElement('a');
    link.href = href;
    link.download = filename;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ==========================================================================
  // Asset 수집
  // ==========================================================================

  /**
   * 웹페이지에서 이미지 Asset 수집
   *
   * 수집 대상:
   * 1. IMG 태그: document.querySelectorAll('img')
   * 2. SVG 요소: document.querySelectorAll('svg')
   * 3. CSS Background Image: getComputedStyle(element).backgroundImage
   *
   * 각 Asset은 설정된 최소 크기(minSize)를 만족해야 하며,
   * 중복 URL은 자동으로 제거됩니다.
   *
   * @returns Promise<void>
   */
  const collectAssets = async (): Promise<void> => {
    isLoading.value = true;
    const collectedAssets: Asset[] = [];

    try {
      // 사용자 설정 가져오기
      const showImages = await getSetting<boolean>('asset-spy', 'showImages');
      const showSVG = await getSetting<boolean>('asset-spy', 'showSVG');
      const showBackgroundImages = await getSetting<boolean>('asset-spy', 'showBackgroundImages');
      const minSize = await getSetting<number>('asset-spy', 'minSize');

      // ----------------------------------------------------------------------
      // 1. IMG 태그 수집
      // ----------------------------------------------------------------------
      if (showImages) {
        document.querySelectorAll('img').forEach((img) => {
          // 유효한 이미지인지 확인 (로드 완료 && 크기 확인)
          if (img.src && img.naturalWidth > 0 && img.naturalHeight > 0) {
            // 최소 크기 필터링
            if (img.naturalWidth >= minSize || img.naturalHeight >= minSize) {
              const filename = getFilenameFromUrl(img.src);

              collectedAssets.push({
                id: generateId(img.src, 'img'),
                type: 'img',
                url: img.src,
                element: img,
                width: img.naturalWidth,
                height: img.naturalHeight,
                filename: ensureExtension(filename, img.src, 'img'),
                thumbnail: img.src,
              });
            }
          }
        });
      }

      // ----------------------------------------------------------------------
      // 2. SVG 요소 수집
      // ----------------------------------------------------------------------
      if (showSVG) {
        document.querySelectorAll('svg').forEach((svg) => {
          const rect = svg.getBoundingClientRect();

          // 화면에 렌더링된 크기 확인
          if (rect.width > 0 && rect.height > 0) {
            // 최소 크기 필터링
            if (rect.width >= minSize || rect.height >= minSize) {
              const dataUrl = svgToDataURL(svg);

              if (dataUrl) {
                collectedAssets.push({
                  id: generateId(dataUrl, 'svg'),
                  type: 'svg',
                  url: dataUrl,
                  element: svg,
                  width: Math.round(rect.width),
                  height: Math.round(rect.height),
                  filename: 'image.svg',
                  thumbnail: dataUrl,
                });
              }
            }
          }
        });
      }

      // ----------------------------------------------------------------------
      // 3. CSS Background Images 수집
      // ----------------------------------------------------------------------
      if (showBackgroundImages) {
        document.querySelectorAll('*').forEach((el) => {
          const style = window.getComputedStyle(el as HTMLElement);
          const bgImage = style.backgroundImage;

          // CSS background-image 속성 확인
          if (bgImage && bgImage !== 'none' && bgImage.startsWith('url(')) {
            // URL 파싱: url("...") 또는 url(...)
            const match = bgImage.match(BG_IMAGE_URL_REGEX);

            if (match && match[1]) {
              const url = match[1];

              // Data URL은 제외 (인라인 이미지)
              if (!url.startsWith('data:')) {
                const rect = el.getBoundingClientRect();

                // 최소 크기 필터링
                if (rect.width >= minSize || rect.height >= minSize) {
                  const filename = getFilenameFromUrl(url);

                  collectedAssets.push({
                    id: generateId(url, 'background'),
                    type: 'background',
                    url: url,
                    element: el as HTMLElement,
                    width: Math.round(rect.width),
                    height: Math.round(rect.height),
                    filename: ensureExtension(filename, url, 'background'),
                    thumbnail: url,
                  });
                }
              }
            }
          }
        });
      }

      // ----------------------------------------------------------------------
      // 중복 제거 (같은 URL)
      // ----------------------------------------------------------------------
      const uniqueAssets = collectedAssets.filter(
        (asset, index, self) =>
          index === self.findIndex((a) => a.url === asset.url)
      );

      assets.value = uniqueAssets;
      console.log(`[AssetSpy] Collected ${uniqueAssets.length} assets`);
    } catch (error) {
      console.error('[AssetSpy] Failed to collect assets:', error);
      assets.value = [];
    } finally {
      isLoading.value = false;
    }
  };

  // ==========================================================================
  // 다운로드
  // ==========================================================================

  /**
   * Background Script를 통한 다운로드 (CORS 완전 우회)
   *
   * Content Script에서는 CORS 제한이 있지만,
   * Background Script는 확장 프로그램 권한으로 모든 리소스 접근 가능
   *
   * @param url - 다운로드할 이미지 URL
   * @param filename - 저장할 파일명
   * @returns 다운로드 성공 여부
   */
  const downloadViaBackground = async (url: string, filename: string): Promise<boolean> => {
    try {
      const response = await browser.runtime.sendMessage({
        type: MessageType.DOWNLOAD_IMAGE,
        url: url,
        filename: filename,
      });

      return response?.success === true;
    } catch (error) {
      console.error('[AssetSpy] Background download failed:', error);
      return false;
    }
  };

  /**
   * Fetch API를 사용해 이미지를 Blob으로 다운로드
   *
   * 브라우저 캐시 활용:
   * - cache: 'force-cache' 옵션으로 네트워크 요청 없이 캐시에서 가져옴
   * - 페이지에 이미 로드된 이미지는 캐시에서 바로 다운로드 가능
   *
   * CORS 제한:
   * - 서버가 Access-Control-Allow-Origin 헤더를 제공해야 함
   * - 실패 시 null 반환 (Background Script 폴백)
   *
   * @param url - 이미지 URL
   * @param timeout - 타임아웃 시간 (기본 30초)
   * @returns Blob 객체 또는 null (실패 시)
   */
  const fetchImageBlob = async (url: string, timeout = FETCH_TIMEOUT_MS): Promise<Blob | null> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        signal: controller.signal,
        cache: 'force-cache',    // 브라우저 캐시 우선 사용
        mode: 'cors',             // CORS 요청
        credentials: 'same-origin',
        headers: {
          'Accept': 'image/*',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();

      // Content-Type 검증 (이미지 타입인지 확인)
      if (!blob.type.startsWith('image/')) {
        throw new Error(`Invalid content type: ${blob.type}`);
      }

      return blob;
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        console.error('[AssetSpy] Fetch timeout:', url);
      } else {
        console.error('[AssetSpy] Fetch failed:', error);
      }
      return null;
    }
  };

  /**
   * 단일 Asset 다운로드
   *
   * 다운로드 전략 (우선순위 순):
   * 1. Data URL → 직접 다운로드 (SVG 등)
   * 2. Background Script → CORS 완전 우회 (확장 프로그램 권한) ⭐ 최선
   * 3. Fetch API → 브라우저 캐시 활용 (CORS 허용 서버만 가능)
   *
   * @param asset - 다운로드할 Asset
   */
  const downloadAsset = async (asset: Asset): Promise<void> => {
    try {
      // ------------------------------------------------------------------------
      // 전략 1: Data URL 직접 다운로드
      // ------------------------------------------------------------------------
      if (asset.url.startsWith('data:')) {
        createDownloadLink(asset.url, asset.filename);
        console.log(`[AssetSpy] ✅ Downloaded (data URL): ${asset.filename}`);
        return;
      }

      // ------------------------------------------------------------------------
      // 전략 2: Background Script 다운로드 (CORS 우회)
      // ------------------------------------------------------------------------
      const bgSuccess = await downloadViaBackground(asset.url, asset.filename);
      if (bgSuccess) {
        console.log(`[AssetSpy] ✅ Downloaded (background): ${asset.filename}`);
        return;
      }

      // ------------------------------------------------------------------------
      // 전략 3: Fetch API 폴백 (브라우저 캐시 활용)
      // ------------------------------------------------------------------------
      const blob = await fetchImageBlob(asset.url);
      if (blob) {
        const blobUrl = URL.createObjectURL(blob);

        createDownloadLink(blobUrl, asset.filename);

        // Blob URL 메모리 정리 (1초 후)
        setTimeout(() => URL.revokeObjectURL(blobUrl), BLOB_CLEANUP_DELAY_MS);

        console.log(`[AssetSpy] ✅ Downloaded (fetch): ${asset.filename}`);
        return;
      }

      // ------------------------------------------------------------------------
      // 모든 전략 실패
      // ------------------------------------------------------------------------
      throw new Error('All download methods failed');

    } catch (error) {
      console.error('[AssetSpy] Failed to download asset:', error);
      alert(
        `Failed to download "${asset.filename}".\n\n` +
        `Error: ${(error as Error).message}`
      );
    }
  };

  /**
   * 모든 Asset 일괄 다운로드
   *
   * 브라우저의 다운로드 제한을 회피하기 위해
   * 각 파일마다 200ms 딜레이 추가
   */
  const downloadAll = async (): Promise<void> => {
    for (let i = 0; i < assets.value.length; i++) {
      setTimeout(() => {
        downloadAsset(assets.value[i]);
      }, i * DOWNLOAD_DELAY_MS);
    }
  };

  // ==========================================================================
  // 필터링
  // ==========================================================================

  /**
   * Asset 타입별 필터링
   *
   * @param type - 필터링할 타입 ('img' | 'svg' | 'background' | 'all')
   * @returns 필터링된 Asset 배열
   */
  const filterByType = (type: 'img' | 'svg' | 'background' | 'all'): Asset[] => {
    if (type === 'all') return assets.value;
    return assets.value.filter((asset) => asset.type === type);
  };

  // ==========================================================================
  // 반환
  // ==========================================================================

  return {
    // 상태
    assets,
    isLoading,

    // 기능
    collectAssets,
    downloadAsset,
    downloadAll,
    filterByType,
  };
}
