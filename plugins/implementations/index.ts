import {copyProtectionBreakerPlugin} from "@/plugins/implementations/copy-protection-breaker";
import {imageSpyPlugin} from "@/plugins/implementations/image-spy";
import cssSpyPluginExample from "@/plugins/implementations/css-spy/css-spy.example";

// 플러그인 등록
export const plugins = [
    // cssSpyPluginExample,
    copyProtectionBreakerPlugin,
    // imageSpyPlugin,
    // cssSpyPlugin,
];

