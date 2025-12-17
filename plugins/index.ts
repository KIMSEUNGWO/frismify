/**
 * Plugin Registration
 *
 * 모든 플러그인을 여기서 import하고 PluginManager에 등록합니다.
 * 새 플러그인을 추가하려면:
 * 1. implementations/ 폴더에 플러그인 구현
 * 2. 여기서 import
 * 3. allPlugins 배열에 추가
 */

import { PluginManager } from '@/core';
import type { Plugin } from '@/types';
import { copyProtectionBreakerPlugin } from '@/plugins/implementations/copy-breaker';
import { colorPicker } from "@/plugins/implementations/color-picker";
import { assetSpyPlugin } from "@/plugins/implementations/asset-spy";
import { rulerPlugin } from '@/plugins/implementations/ruler';
import { imageConverter } from "@/plugins/implementations/image-converter";
import {accessibilityPlugin} from "@/plugins/implementations/accessibility";
import { hlsDownloader } from "@/plugins/implementations/hls-downloader";

/**
 * 모든 플러그인 정의 배열
 * Popup/Options에서 icon 렌더링을 위해 export
 */
export const allPlugins: Plugin[] = [
  copyProtectionBreakerPlugin,
  accessibilityPlugin,
  colorPicker,
  assetSpyPlugin,
  imageConverter,
  rulerPlugin,
  hlsDownloader
];

/**
 * 모든 플러그인 등록
 * Background와 Content Script에서 호출됨
 */
export async function registerPlugins(): Promise<void> {
  const manager = PluginManager.getInstance();

  // 플러그인 등록
  for (const plugin of allPlugins) {
    await manager.register(plugin);
  }

  console.log(`[Plugins] ${manager.getPluginCount()} plugins registered`);
}
