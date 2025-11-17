# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Prismify** (프론트엔드 개발자를 위한 올인원 툴킷) is a browser extension built with WXT and Vue 3. It provides a plugin-based architecture where developer tools are implemented as modular plugins that can be enabled/disabled and controlled via keyboard shortcuts.

## Development Commands

```bash
# Development
npm run dev              # Chrome development mode with hot reload
npm run dev:firefox      # Firefox development mode

# Production
npm run build            # Production build for Chrome
npm run build:firefox    # Production build for Firefox
npm run zip              # Create distributable zip for Chrome
npm run zip:firefox      # Create distributable zip for Firefox

# Type checking
npm run compile          # Run TypeScript compiler without emitting files
```

## Architecture Overview

### Core Design Principle: Simplicity & Encapsulation

The architecture follows these principles:

1. **Facade Pattern**: Single entry point (`PluginManager`) for all plugin operations
2. **Singleton Pattern**: Consistent instances across all contexts (Background, Content, Popup, Options)
3. **Encapsulation**: Minimal public API, internal implementation hidden
4. **Single Responsibility**: Each module does one thing well
5. **Type Safety**: Full TypeScript coverage

### Project Structure

```
frismify/
├── core/                    # Core architecture (DO NOT MODIFY unless refactoring)
│   ├── PluginManager.ts    # Facade for all plugin operations
│   ├── ShortcutManager.ts  # Keyboard shortcut handling
│   ├── StorageManager.ts   # browser.storage.local wrapper
│   └── index.ts            # Public exports
│
├── plugins/                 # Plugin system
│   ├── implementations/     # Individual plugin implementations
│   │   └── example/        # Example plugin (reference implementation)
│   └── index.ts            # Plugin registration
│
├── entrypoints/            # WXT entrypoints (convention-based)
│   ├── background.ts       # Service worker
│   ├── content/index.ts    # Content script
│   ├── popup/              # Extension popup UI (Vue)
│   └── options/            # Options page (Vue + Router)
│
├── utils/                  # Utilities
│   └── platform.ts         # OS detection (Mac/Windows/Linux)
│
├── types.ts                # Global type definitions
└── wxt.config.ts           # WXT configuration
```

## Core Modules

### PluginManager (Facade)

**Single source of truth for all plugin operations.**

```typescript
import { PluginManager } from '@/core';

const manager = PluginManager.getInstance();

// Plugin registration
await manager.register(myPlugin);

// Plugin state
await manager.togglePlugin('plugin-id');
await manager.enablePlugin('plugin-id');
await manager.disablePlugin('plugin-id');
const isEnabled = await manager.isEnabled('plugin-id');

// Plugin queries
const plugins = manager.getPlugins();
const plugin = manager.getPlugin('plugin-id');
const enabled = await manager.getEnabledPlugins();

// Settings
const settings = await manager.getSettings('plugin-id');
await manager.updateSetting('plugin-id', 'key', value);

// Lifecycle
await manager.activate('plugin-id', ctx);
await manager.cleanup('plugin-id');
await manager.cleanupAll();

// Shortcuts
const commands = manager.getCommands(); // For manifest.json
const parsed = manager.parseCommand('plugin-id__shortcut-id');

// State listeners
manager.addListener((state) => console.log('State changed:', state));
```

**Never access internal modules directly. Always use PluginManager.**

### ShortcutManager

Handles keyboard shortcut logic.

```typescript
import { ShortcutManager } from '@/core';

const shortcut = ShortcutManager.getInstance();

// Match keyboard events
if (shortcut.matches(event, ['Cmd', 'Shift', 'P'])) {
  // Handle shortcut
}

// Format for display
const formatted = shortcut.format(['Cmd', 'Shift', 'P']);
// Mac:     ⌘⇧P
// Windows: Ctrl + Shift + P

// Generate Chrome Commands API format
const command = shortcut.toCommand(['Cmd', 'Shift', 'P']);
// { windows: 'Ctrl+Shift+P', mac: 'Command+Shift+P' }
```

### StorageManager

Wraps `browser.storage.local` with type safety.

```typescript
import { StorageManager } from '@/core';

const storage = StorageManager.getInstance();

// Get/set state
const state = await storage.getState();
await storage.setState(state);

// Update state functionally
await storage.updateState(state => {
  state.plugins['my-plugin'].enabled = true;
  return state;
});

// Listen to changes
storage.addListener((newState) => {
  console.log('Storage changed:', newState);
});
```

**Note**: You should rarely use StorageManager directly. Use PluginManager instead.

## Plugin Development

### Creating a New Plugin

1. Create directory in `plugins/implementations/`
2. Create `index.ts` with plugin definition
3. Register in `plugins/index.ts`

**Example:**

```typescript
// plugins/implementations/my-plugin/index.ts

import type { Plugin } from '@/types';

export const myPlugin: Plugin = {
  // === Metadata ===
  id: 'my-plugin',
  name: 'My Plugin',
  description: 'Plugin description',
  category: 'inspector' | 'performance' | 'design' | 'utility',
  version: '1.0.0',
  tier: 'free' | 'pro',

  // Icon render function
  icon: (container) => {
    container.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    container.innerHTML = '<svg>...</svg>';
  },

  // === Execution ===
  matches: ['<all_urls>'],  // Optional, default: ['<all_urls>']
  runAt: 'document_idle',   // Optional, default: 'document_idle'

  // === Settings Schema ===
  settings: {
    enabled: {
      type: 'boolean',
      label: 'Enable feature',
      description: 'Description here',
      defaultValue: true,
    },
    color: {
      type: 'string',
      label: 'Color',
      defaultValue: '#FF0000',
    },
    count: {
      type: 'number',
      label: 'Count',
      defaultValue: 10,
    },
    mode: {
      type: 'select',
      label: 'Mode',
      defaultValue: 'auto',
      options: [
        { label: 'Auto', value: 'auto' },
        { label: 'Manual', value: 'manual' },
      ],
    },
  },

  // === Shortcuts ===
  shortcuts: {
    toggle: {
      name: 'Toggle Plugin',
      description: 'Toggle plugin on/off',
      keys: ['Cmd', 'Shift', 'P'],
      handler: async (event, ctx) => {
        // Shortcut logic here
      },
    },
  },

  // === Lifecycle ===
  onActivate: async (ctx) => {
    // Plugin activation logic
    const element = document.createElement('div');
    element.id = 'my-plugin-element';
    document.body.appendChild(element);
  },

  onCleanup: () => {
    // Cleanup logic
    document.getElementById('my-plugin-element')?.remove();
  },
};
```

```typescript
// plugins/index.ts

import { PluginManager } from '@/core';
import { myPlugin } from './implementations/my-plugin';

export async function registerPlugins(): Promise<void> {
  const manager = PluginManager.getInstance();

  await manager.register(myPlugin);
  // Register additional plugins...

  console.log(`[Plugins] ${manager.getPluginCount()} plugins registered`);
}
```

### Plugin Best Practices

1. **Keep plugins simple**: One plugin = one feature
2. **Always provide cleanup**: Prevent memory leaks
3. **Use settings for configuration**: Don't hardcode values
4. **Test across platforms**: Mac and Windows have different shortcuts
5. **Follow naming convention**: Use kebab-case for IDs
6. **Provide clear descriptions**: Help users understand what the plugin does
7. **Use semantic versioning**: 1.0.0 format

### Accessing Settings in Plugins

```typescript
onActivate: async (ctx) => {
  const manager = PluginManager.getInstance();
  const settings = await manager.getSettings('my-plugin');

  console.log('Enabled:', settings.enabled);
  console.log('Color:', settings.color);

  // Listen to settings changes
  manager.addListener((state) => {
    const newSettings = state.plugins['my-plugin']?.settings;
    if (newSettings) {
      console.log('Settings changed:', newSettings);
    }
  });
},
```

## WXT Framework

WXT uses convention-based file structure where files in `entrypoints/` define extension parts:

- **background.ts**: Service worker (persistent background process)
- **content/index.ts**: Content script (runs on web pages)
- **popup/**: Popup UI (click extension icon)
- **options/**: Full-page settings

### Background Script

```typescript
import { PluginManager } from '@/core';
import { registerPlugins } from '@/plugins';

export default defineBackground(async () => {
  const manager = PluginManager.getInstance();
  await registerPlugins();

  // Handle messages from popup/options
  browser.runtime.onMessage.addListener(async (message) => {
    if (message.type === 'TOGGLE_PLUGIN') {
      await manager.togglePlugin(message.pluginId);
    }
  });
});
```

### Content Script

```typescript
import { PluginManager, ShortcutManager } from '@/core';
import { registerPlugins } from '@/plugins';

export default defineContentScript({
  matches: ['<all_urls>'],
  async main(ctx) {
    const manager = PluginManager.getInstance();
    await registerPlugins();

    // Activate enabled plugins
    for (const plugin of manager.getPlugins()) {
      if (await manager.isEnabled(plugin.id)) {
        await manager.activate(plugin.id, ctx);
      }
    }

    // Cleanup on invalidation
    ctx.onInvalidated(async () => {
      await manager.cleanupAll();
    });
  },
});
```

### Popup / Options (Vue)

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { PluginManager } from '@/core';

const manager = PluginManager.getInstance();
const plugins = ref([]);

onMounted(async () => {
  plugins.value = manager.getPlugins();
});

async function togglePlugin(pluginId: string) {
  await manager.togglePlugin(pluginId);
}
</script>
```

## Type System

All types are defined in `types.ts`:

```typescript
// Plugin definition (simplified, no nesting)
interface Plugin {
  id: string;
  name: string;
  description: string;
  category: 'inspector' | 'performance' | 'design' | 'utility';
  version: string;
  tier: 'free' | 'pro';
  icon: (container: HTMLDivElement) => void;

  matches?: string[];
  runAt?: 'document_start' | 'document_end' | 'document_idle';

  onActivate?: (ctx: ContentScriptContext) => void | Promise<void>;
  onCleanup?: () => void | Promise<void>;

  settings?: Record<string, PluginSetting>;
  shortcuts?: Record<string, PluginShortcut>;
}

// Stored state
interface PluginState {
  enabled: boolean;
  settings: Record<string, any>;
  shortcuts: Record<string, ShortcutState>;
}

// App state (stored in browser.storage.local)
interface AppState {
  plugins: Record<string, PluginState>;
}
```

## Path Aliases

TypeScript is configured with `@/*` alias pointing to project root:

```typescript
import { PluginManager } from '@/core';
import type { Plugin } from '@/types';
import { Platform } from '@/utils/platform';
```

## Platform Detection

Use the `Platform` singleton for OS-specific logic:

```typescript
import { Platform } from '@/utils/platform';

const platform = Platform.getInstance();

if (platform.isMac) {
  // Mac-specific code
} else if (platform.isWindows) {
  // Windows-specific code
}

console.log(platform.type); // 'mac' | 'windows' | 'linux' | 'unknown'
console.log(platform.name); // 'macOS' | 'Windows' | 'Linux' | 'Unknown'
```

## Keyboard Shortcuts

Shortcuts use abstracted format that converts to platform-specific representations:

```typescript
// Define shortcuts
shortcuts: {
  toggle: {
    keys: ['Cmd', 'Shift', 'P'],  // Auto-converts: Mac → ⌘⇧P, Windows → Ctrl+Shift+P
    handler: async (event, ctx) => { ... }
  }
}

// Valid modifier keys: 'Cmd', 'Shift', 'Alt', 'Ctrl'
// Regular keys: 'A'-'Z', '0'-'9', 'F1'-'F12', etc.
```

**Storage format** (for custom shortcuts):
```typescript
{
  windows: 'Ctrl+Shift+P',      // Text format
  mac: 'Command+Shift+P'         // Text format (NOT symbols!)
}
```

**Chrome Commands API format** (in manifest.json):
```json
{
  "plugin-id__shortcut-id": {
    "suggested_key": {
      "windows": "Ctrl+Shift+P",
      "mac": "Command+Shift+P"
    },
    "description": "Shortcut description"
  }
}
```

## Business Model

- **Free Tier**: 4 core plugins (CSS Spy, Color Picker, Ruler, Grid Overlay)
- **Pro Tier**: 11 premium plugins

Plugins are marked with `tier: 'free' | 'pro'`.

## Important Rules

### DO:
- ✅ Use `PluginManager` for all plugin operations
- ✅ Use singleton pattern (`getInstance()`)
- ✅ Follow the example plugin structure
- ✅ Provide cleanup logic in plugins
- ✅ Use TypeScript types from `@/types`
- ✅ Test on both Mac and Windows

### DON'T:
- ❌ Access `StorageManager` directly (use `PluginManager` instead)
- ❌ Create new data structures without good reason
- ❌ Modify core modules (`core/`) unless refactoring
- ❌ Forget cleanup logic (causes memory leaks)
- ❌ Use emojis unless explicitly requested
- ❌ Hardcode platform-specific shortcuts (use abstracted format)

## Common Tasks

### Adding a new plugin:
1. Create `plugins/implementations/my-plugin/index.ts`
2. Define plugin following the `Plugin` interface
3. Import and register in `plugins/index.ts`

### Modifying plugin behavior:
1. Update plugin definition in `plugins/implementations/*/index.ts`
2. Changes are automatically picked up on reload

### Debugging:
```typescript
const manager = PluginManager.getInstance();
const debugInfo = await manager.getDebugInfo();
console.log(debugInfo);
```

### Clearing storage:
```typescript
const storage = StorageManager.getInstance();
await storage.clear(); // WARNING: Deletes all data!
```

## Migration Guide (Old → New Architecture)

If you encounter old code:

### Old (Complex, Coupled):
```typescript
import { pluginRegistry } from '@/plugins/registry';
import { settingsManager } from '@/utils/settings-manager';
import { localStorage } from '@/utils/localStorage';

const plugins = pluginRegistry.findAll();
await settingsManager.initialize();
const enabled = settingsManager.isPluginEnabled('id');
```

### New (Simple, Encapsulated):
```typescript
import { PluginManager } from '@/core';

const manager = PluginManager.getInstance();
const plugins = manager.getPlugins();
const enabled = await manager.isEnabled('id');
```

## Additional Documentation

- **README.md**: Comprehensive architecture guide
- **PLUGIN.md**: Plugin roadmap (if exists)
- **PRODUCE.md**: Business strategy (if exists)

## Auto-Generated Files

- `.wxt/`: WXT-generated configuration
- Do NOT edit these files
- Regenerated by `wxt prepare` (runs on `npm install`)

---

**Remember**: Keep it simple. Use `PluginManager` for everything. Follow the example plugin.
