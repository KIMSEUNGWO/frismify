import {cssSpyPlugin} from "@/plugins/implementations/css-spy";
import {copyProtectionBreakerPlugin} from "../../plugins/implementations/copy-protection-breaker";
import {imageSpyPlugin} from "../../plugins/implementations/image-spy";
import {pluginRegistry} from "../../plugins/registry";
import cssSpyPluginExample from "../../plugins/implementations/css-spy.example";

let initialized = false;


export function initializePlugins() {
  // 이미 초기화되었으면 스킵
  if (initialized) {
    console.log('📦 Plugins already initialized, skipping...');
    return pluginRegistry;
  }

  // 플러그인 등록
  // pluginRegistry.register(cssSpyPlugin);
  pluginRegistry.register(cssSpyPluginExample);
  pluginRegistry.register(copyProtectionBreakerPlugin);
  pluginRegistry.register(imageSpyPlugin);

  // 개발 중 확인
  console.log('📦 Total plugins loaded:', pluginRegistry.findAll().length);
  console.log('⌨️ Plugins with shortcuts:', pluginRegistry.findAllWithHasShortcuts().length);

  initialized = true;
  return pluginRegistry;
}

// 즉시 실행 (런타임용)
initializePlugins();
