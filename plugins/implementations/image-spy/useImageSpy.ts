import { ref } from 'vue';
import { getSetting } from '@/utils/settings';

export interface ImageAsset {
  id: string;
  type: 'img' | 'svg' | 'background';
  url: string;
  element: Element;
  width: number;
  height: number;
  filename: string;
  thumbnail: string;
}

export function useImageSpy() {
  const assets = ref<ImageAsset[]>([]);
  const isLoading = ref(false);

  /**
   * SVG를 Data URL로 변환
   */
  const svgToDataURL = (svg: SVGElement): string => {
    try {
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svg);
      const base64 = btoa(unescape(encodeURIComponent(svgString)));
      return `data:image/svg+xml;base64,${base64}`;
    } catch (error) {
      console.error('[ImageSpy] Failed to convert SVG to Data URL:', error);
      return '';
    }
  };

  /**
   * URL에서 파일명 추출
   */
  const getFilenameFromUrl = (url: string): string => {
    try {
      const urlObj = new URL(url, window.location.href);
      const pathname = urlObj.pathname;
      const filename = pathname.substring(pathname.lastIndexOf('/') + 1);
      return filename || 'image';
    } catch {
      return 'image';
    }
  };

  /**
   * 고유 ID 생성
   */
  const generateId = (url: string, type: string): string => {
    return `${type}-${btoa(url).substring(0, 16)}`;
  };

  /**
   * 웹페이지에서 Asset 수집
   */
  const collectAssets = async (): Promise<void> => {
    isLoading.value = true;
    const collectedAssets: ImageAsset[] = [];

    try {
      // 설정 가져오기
      const showImages = await getSetting<boolean>('image-spy', 'showImages');
      const showSVG = await getSetting<boolean>('image-spy', 'showSVG');
      const showBackgroundImages = await getSetting<boolean>('image-spy', 'showBackgroundImages');
      const minSize = await getSetting<number>('image-spy', 'minSize');

      // 1. IMG 태그 수집
      if (showImages) {
        document.querySelectorAll('img').forEach((img) => {
          if (img.src && img.naturalWidth > 0 && img.naturalHeight > 0) {
            if (img.naturalWidth >= minSize || img.naturalHeight >= minSize) {
              collectedAssets.push({
                id: generateId(img.src, 'img'),
                type: 'img',
                url: img.src,
                element: img,
                width: img.naturalWidth,
                height: img.naturalHeight,
                filename: getFilenameFromUrl(img.src),
                thumbnail: img.src,
              });
            }
          }
        });
      }

      // 2. SVG 요소 수집
      if (showSVG) {
        document.querySelectorAll('svg').forEach((svg) => {
          const rect = svg.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
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

      // 3. CSS Background Images 수집
      if (showBackgroundImages) {
        document.querySelectorAll('*').forEach((el) => {
          const style = window.getComputedStyle(el as HTMLElement);
          const bgImage = style.backgroundImage;

          if (bgImage && bgImage !== 'none' && bgImage.startsWith('url(')) {
            // url("...") 또는 url(...) 파싱
            const match = bgImage.match(/url\(['"]?([^'"]+)['"]?\)/);
            if (match && match[1]) {
              const url = match[1];
              // data URL 제외
              if (!url.startsWith('data:')) {
                const rect = el.getBoundingClientRect();
                if (rect.width >= minSize || rect.height >= minSize) {
                  collectedAssets.push({
                    id: generateId(url, 'background'),
                    type: 'background',
                    url: url,
                    element: el as HTMLElement,
                    width: Math.round(rect.width),
                    height: Math.round(rect.height),
                    filename: getFilenameFromUrl(url),
                    thumbnail: url,
                  });
                }
              }
            }
          }
        });
      }

      // 중복 제거 (같은 URL)
      const uniqueAssets = collectedAssets.filter(
        (asset, index, self) =>
          index === self.findIndex((a) => a.url === asset.url)
      );

      assets.value = uniqueAssets;
      console.log(`[ImageSpy] Collected ${uniqueAssets.length} assets`);
    } catch (error) {
      console.error('[ImageSpy] Failed to collect assets:', error);
      assets.value = [];
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Fetch API를 사용해 이미지를 Blob으로 다운로드 (Canvas 우회)
   * CORS 문제를 최소화하는 방법
   */
  const fetchImageBlob = async (url: string, timeout = 30000): Promise<Blob | null> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'image/*',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();

      // Content-Type 검증
      const contentType = blob.type;
      if (!contentType.startsWith('image/')) {
        throw new Error(`Invalid content type: ${contentType}`);
      }

      return blob;
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        console.error('[ImageSpy] Fetch timeout:', url);
      } else {
        console.error('[ImageSpy] Fetch failed:', error);
      }
      return null;
    }
  };

  /**
   * Canvas를 사용해 이미지를 Blob으로 변환 (폴백용)
   * crossOrigin 설정으로 CORS 허용 서버의 이미지만 가능
   */
  const canvasToBlob = async (url: string, width?: number, height?: number): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = async () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = width || img.naturalWidth;
          canvas.height = height || img.naturalHeight;

          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Failed to get canvas context');

          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          canvas.toBlob((blob) => {
            resolve(blob);
          }, 'image/png');
        } catch (error) {
          console.error('[ImageSpy] Canvas conversion failed:', error);
          resolve(null);
        }
      };

      img.onerror = () => {
        console.error('[ImageSpy] Image load failed:', url);
        resolve(null);
      };

      img.src = url;
    });
  };

  /**
   * Asset 다운로드
   * 전략: Data URL → browser.downloads API (CORS 우회) → Fetch → Canvas
   *
   * 핵심: 이미 브라우저에 로드된 이미지를 다시 fetch하지 않고,
   * 확장 프로그램 권한(browser.downloads)으로 CORS 우회
   */
  const downloadAsset = async (asset: ImageAsset): Promise<void> => {
    try {
      // 1. Data URL (SVG 등): 직접 다운로드
      if (asset.url.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = asset.url;
        link.download = asset.filename;
        link.style.display = 'none';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        console.log(`[ImageSpy] ✅ Downloaded (data URL): ${asset.filename}`);
        return;
      }

      // 2. browser.downloads API 우선 사용 (확장 프로그램 권한으로 CORS 우회)
      if (typeof browser !== 'undefined' && browser.downloads) {
        try {
          await browser.downloads.download({
            url: asset.url,
            filename: asset.filename,
            saveAs: false,
            conflictAction: 'uniquify', // 중복 파일명 자동 처리
          });
          console.log(`[ImageSpy] ✅ Downloaded (extension): ${asset.filename}`);
          return;
        } catch (downloadError) {
          console.warn('[ImageSpy] browser.downloads failed, trying fallback:', downloadError);
          // 폴백 계속 진행
        }
      }

      // 3. 폴백: Fetch API 시도
      let blob = await fetchImageBlob(asset.url);
      if (blob) {
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = asset.filename;
        link.style.display = 'none';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);

        console.log(`[ImageSpy] ✅ Downloaded (fetch): ${asset.filename}`);
        return;
      }

      // 4. 최후의 폴백: Canvas 방식
      console.log(`[ImageSpy] Fetch failed, trying Canvas method: ${asset.filename}`);
      blob = await canvasToBlob(asset.url, asset.width, asset.height);
      if (blob) {
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = asset.filename;
        link.style.display = 'none';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);

        console.log(`[ImageSpy] ✅ Downloaded (canvas): ${asset.filename}`);
        return;
      }

      // 모든 방법 실패
      throw new Error('All download methods failed');

    } catch (error) {
      console.error('[ImageSpy] Failed to download asset:', error);
      alert(
        `Failed to download "${asset.filename}".\n\n` +
        `Error: ${(error as Error).message}`
      );
    }
  };

  /**
   * 모든 Asset 다운로드
   */
  const downloadAll = async (): Promise<void> => {
    for (let i = 0; i < assets.value.length; i++) {
      // 브라우저 다운로드 제한을 피하기 위해 딜레이 추가
      setTimeout(() => {
        downloadAsset(assets.value[i]);
      }, i * 200);
    }
  };

  /**
   * Asset 필터링
   */
  const filterByType = (type: 'img' | 'svg' | 'background' | 'all'): ImageAsset[] => {
    if (type === 'all') return assets.value;
    return assets.value.filter((asset) => asset.type === type);
  };

  return {
    assets,
    isLoading,
    collectAssets,
    downloadAsset,
    downloadAll,
    filterByType,
  };
}
