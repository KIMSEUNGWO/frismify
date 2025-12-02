/**
 * Settings Utility
 *
 * 플러그인 설정 값을 쉽게 가져오고 조회하기 위한 헬퍼 함수들
 *
 * 사용 예시:
 * ```typescript
 * import { getSetting, getSettingWithFallback } from '@/utils/settings';
 *
 * // 설정 값 가져오기 (저장된 값 또는 기본값)
 * const color = await getSetting('my-plugin', 'color');
 *
 * // fallback 값 지정
 * const count = await getSettingWithFallback('my-plugin', 'count', 10);
 * ```
 */

import { pluginManagerProxy } from '@/core';
import type { PluginSetting } from '@/types';

/**
 * 개별 설정 값 가져오기
 * 저장된 값이 있으면 반환, 없으면 스키마의 기본값 반환
 *
 * @param pluginId - 플러그인 ID
 * @param settingKey - 설정 키
 * @returns 설정 값 (저장된 값 또는 기본값)
 * @throws 플러그인이나 설정이 존재하지 않을 때 에러
 */
export async function getSetting<T = any>(
    pluginId: string,
    settingKey: string
): Promise<T> {

  // 플러그인 정의 가져오기 (Proxy를 통해 Background에서)
  const plugin = await pluginManagerProxy.getPlugin(pluginId);
  if (!plugin) {
    throw new Error(`Plugin "${pluginId}" not found`);
  }

  // 설정 스키마 확인
  const schema = plugin.settings?.[settingKey];
  if (!schema) {
    throw new Error(`Setting "${settingKey}" not found in plugin "${pluginId}"`);
  }

  // 저장된 설정 값 가져오기 (Proxy를 통해 Background에서)
  const settings = await pluginManagerProxy.getPluginSettings(pluginId);

  // 저장된 값이 있으면 반환, 없으면 기본값 반환
  return (settings[settingKey] ?? schema.defaultValue) as T;
}

/**
 * 개별 설정 값 가져오기 (fallback 지원)
 * 저장된 값 -> 스키마 기본값 -> fallback 순서로 반환
 *
 * @param pluginId - 플러그인 ID
 * @param settingKey - 설정 키
 * @param fallback - 기본값이 없을 때 사용할 fallback 값
 * @returns 설정 값
 */
export async function getSettingWithFallback<T = any>(
  pluginId: string,
  settingKey: string,
  fallback: T
): Promise<T> {
  try {
    return await getSetting<T>(pluginId, settingKey);
  } catch (error) {
    console.warn(`[Settings] Failed to get setting, using fallback:`, error);
    return fallback;
  }
}

/**
 * 설정 스키마 정보 가져오기
 *
 * @param pluginId - 플러그인 ID
 * @param settingKey - 설정 키
 * @returns 설정 스키마 또는 undefined
 */
export async function getSettingSchema(
  pluginId: string,
  settingKey: string
): Promise<PluginSetting | undefined> {
  const plugin = await pluginManagerProxy.getPlugin(pluginId);
  return plugin?.settings?.[settingKey];
}

/**
 * 설정의 기본값 가져오기
 *
 * @param pluginId - 플러그인 ID
 * @param settingKey - 설정 키
 * @returns 기본값 또는 undefined
 */
export async function getDefaultValue(
  pluginId: string,
  settingKey: string
): Promise<any> {
  const schema = await getSettingSchema(pluginId, settingKey);
  return schema?.defaultValue;
}

/**
 * 플러그인의 모든 기본 설정 가져오기
 *
 * @param pluginId - 플러그인 ID
 * @returns 기본 설정 객체
 */
export async function getAllDefaultSettings(pluginId: string): Promise<Record<string, any>> {
  const plugin = await pluginManagerProxy.getPlugin(pluginId);

  if (!plugin?.settings) {
    return {};
  }

  const defaults: Record<string, any> = {};
  for (const [key, setting] of Object.entries(plugin.settings)) {
    defaults[key] = setting.defaultValue;
  }

  return defaults;
}

/**
 * 설정이 존재하는지 확인
 *
 * @param pluginId - 플러그인 ID
 * @param settingKey - 설정 키
 * @returns 설정 존재 여부
 */
export async function hasSetting(pluginId: string, settingKey: string): Promise<boolean> {
  return (await getSettingSchema(pluginId, settingKey)) !== undefined;
}

/**
 * 플러그인의 모든 설정과 현재 값 가져오기
 *
 * @param pluginId - 플러그인 ID
 * @returns 설정 키와 현재 값의 맵
 */
export async function getAllSettings(pluginId: string): Promise<Record<string, any>> {
  const plugin = await pluginManagerProxy.getPlugin(pluginId);

  if (!plugin?.settings) {
    return {};
  }

  // 저장된 값 가져오기 (Proxy를 통해 Background에서)
  const storedSettings = await pluginManagerProxy.getPluginSettings(pluginId);

  // 스키마의 모든 키에 대해 값 설정 (저장된 값 또는 기본값)
  const allSettings: Record<string, any> = {};
  for (const [key, schema] of Object.entries(plugin.settings)) {
    allSettings[key] = storedSettings[key] ?? schema.defaultValue;
  }

  return allSettings;
}

/**
 * 설정 스키마와 현재 값을 함께 반환
 *
 * @param pluginId - 플러그인 ID
 * @returns 설정 스키마와 값을 포함한 객체 배열
 */
export async function getSettingsWithSchema(pluginId: string): Promise<
  Array<{
    key: string;
    schema: PluginSetting;
    value: any;
  }>
> {
  const plugin = await pluginManagerProxy.getPlugin(pluginId);

  if (!plugin?.settings) {
    return [];
  }

  // 저장된 값 가져오기 (Proxy를 통해 Background에서)
  const storedSettings = await pluginManagerProxy.getPluginSettings(pluginId);

  return Object.entries(plugin.settings).map(([key, schema]) => ({
    key,
    schema,
    value: storedSettings[key] ?? schema.defaultValue,
  }));
}
