
/**
 * Asset 인터페이스
 * 웹페이지에서 수집된 이미지 정보를 담는 객체
 */
export interface Asset {
    id: string;                         // 고유 식별자
    type: AssetType;                    // Asset 타입 (IMG 태그 | SVG 요소 | CSS 배경)
    url: string;                        // 이미지 URL 또는 Data URL
    element: Element;                   // DOM 요소 참조
    width: number;                      // 이미지 너비 (px)
    height: number;                     // 이미지 높이 (px)
    filename: string;                   // 다운로드할 파일명 (확장자 포함)
    thumbnail: string;                  // 썸네일 URL (미리보기용)
    fileSize?: number;                  // 파일 크기 (bytes, 옵션)
}

export const AssetType = {
    IMG: 'IMG',
    SVG: 'SVG',
    BACKGROUND: 'BACKGROUND',
} as const;

export type AssetType = typeof AssetType[keyof typeof AssetType];
