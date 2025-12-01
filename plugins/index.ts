/**
 * Plugin Registration
 *
 * 모든 플러그인을 여기서 import하고 PluginManager에 등록합니다.
 * 새 플러그인을 추가하려면:
 * 1. implementations/ 폴더에 플러그인 구현
 * 2. 여기서 import
 * 3. registerPlugins() 함수에 추가
 */

import { PluginManager } from '@/core';
import { examplePlugin } from '@/plugins/implementations/example';
import { copyProtectionBreakerPlugin } from '@/plugins/implementations/copy-breaker';
import { colorPicker } from "@/plugins/implementations/color-picker";

/**
 * 모든 플러그인 등록
 * Background와 Content Script에서 호출됨
 */
export async function registerPlugins(): Promise<void> {
  const manager = PluginManager.getInstance();

  // 플러그인 등록
  await manager.register(examplePlugin);
  await manager.register(copyProtectionBreakerPlugin);
  await manager.register(colorPicker);

  console.log(`[Plugins] ${manager.getPluginCount()} plugins registered`);
}