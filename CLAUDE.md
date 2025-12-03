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
prismify/
├── core/                    # Core architecture (DO NOT MODIFY unless refactoring)
│   ├── PluginManager.ts    # Facade for all plugin operations
│   ├── ModalManager.ts     # Modal window management
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
│   ├── content/            # Content script
│   │   ├── index.ts       # Main content script
│   │   ├── App.vue        # Modal container component
│   │   └── router/        # Vue Router for modal views
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

### PluginManager vs PluginManagerProxy

**CRITICAL**: Different contexts use different managers!

#### Background Script ONLY: PluginManager
```typescript
import { PluginManager } from '@/core';

const manager = PluginManager.getInstance();

// Plugin registration (Background ONLY!)
await manager.register(myPlugin);

// Plugin state management
await manager.togglePlugin('plugin-id');
await manager.enablePlugin('plugin-id');
await manager.disablePlugin('plugin-id');
const isEnabled = await manager.isEnabled('plugin-id');

// Plugin queries
const plugins = manager.getPlugins();
const plugin = manager.getPlugin('plugin-id');

// Settings
const settings = await manager.getSettings('plugin-id');
await manager.updateSetting('plugin-id', 'key', value);

// Lifecycle (Background manages state)
await manager.activate('plugin-id', ctx);
await manager.cleanup('plugin-id');

// State listeners
manager.addListener((state) => console.log('State changed:', state));
```

#### Content Script / Popup / Options: PluginManagerProxy
```typescript
import { pluginManagerProxy } from '@/core';

// Query plugins (RPC to Background)
const plugins = await pluginManagerProxy.getPlugins();
const plugin = await pluginManagerProxy.getPlugin('plugin-id');

// Query state
const state = await pluginManagerProxy.getPluginState('plugin-id');

// Modify state (RPC to Background)
await pluginManagerProxy.togglePlugin('plugin-id');
await pluginManagerProxy.enablePlugin('plugin-id');
await pluginManagerProxy.disablePlugin('plugin-id');

// Settings
const settings = await pluginManagerProxy.getPluginSettings('plugin-id');
await pluginManagerProxy.updateSetting('plugin-id', 'key', value);

// Real-time state updates (via Port connection)
pluginManagerProxy.addListener((state) => {
  console.log('State changed:', state);
});
```

**Rules:**
- ✅ Background: Use `PluginManager.getInstance()`
- ✅ Content/Popup/Options: Use `pluginManagerProxy`
- ❌ NEVER use `PluginManager` in Content/Popup/Options
- ❌ NEVER call `register()` outside Background

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

### ModalManager

Manages modal windows for plugins that need UI overlays.

```typescript
import { modalManager } from '@/core/ModalManager';

// Open modal for a plugin
modalManager.openModal('plugin-id');

// Close current modal
modalManager.removeModal();

// Check if modal is open
if (modalManager.isOpen('plugin-id')) {
  // Modal is open for this plugin
}

// Check if any modal is open
if (modalManager.isAnyOpen()) {
  // Some modal is open
}
```

**Modal Architecture:**
- Modals are Vue apps mounted in the content script context
- Each modal has its own route via Vue Router
- Modal component is defined in `entrypoints/content/App.vue`
- Modal views are defined in plugin-specific routes
- Modals are draggable and auto-snap to viewport boundaries

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
      handler: async (event, ctx) => {
        // IMPORTANT: Shortcuts run in Content Script context!
        // Use pluginManagerProxy, NOT PluginManager
        const { pluginManagerProxy } = await import('@/core');
        await pluginManagerProxy.togglePlugin('my-plugin');
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
  // IMPORTANT: onActivate runs in Content Script context!
  // Use pluginManagerProxy, NOT PluginManager
  const { pluginManagerProxy } = await import('@/core');
  const settings = await pluginManagerProxy.getPluginSettings('my-plugin');

  console.log('Enabled:', settings.enabled);
  console.log('Color:', settings.color);

  // Listen to settings changes (real-time via Port)
  pluginManagerProxy.addListener((state) => {
    const newSettings = state.plugins['my-plugin']?.settings;
    if (newSettings) {
      console.log('Settings changed:', newSettings);
    }
  });
},
```

### One-Shot Plugin Execution

For plugins that execute once on-demand (like opening a color picker or taking a screenshot), use `onExecute` instead of `onActivate`:

```typescript
export const myPlugin: Plugin = {
  // ... metadata ...

  // Execute once with shortcut (no persistent state)
  onExecute: {
    type: 'EXECUTE_PLUGIN', // or 'OPEN_MODAL'
    execute: async (ctx) => {
      // One-time execution logic
      const picker = createColorPicker();
      picker.open();
    },
  },

  // Optional: Shortcut to trigger execution
  shortcuts: {
    execute: {
      name: 'Execute Plugin',
      description: 'Execute this plugin',
      handler: async (event, ctx) => {
        // IMPORTANT: Shortcuts run in Content Script context!
        // Use pluginManagerProxy for state queries
        const { pluginManagerProxy } = await import('@/core');
        // Custom execution logic or trigger onExecute
        // Note: onExecute.execute() is called automatically by content script
      }
    }
  },

  // Don't use onActivate for one-shot plugins
};
```

**Difference:**
- `onActivate`: Runs when plugin is enabled, maintains persistent state (e.g., grid overlay always visible)
- `onExecute`: Runs once when triggered via shortcut or popup click, no persistent state (e.g., color picker opens temporarily)

**Execute Types:**
- `EXECUTE_PLUGIN`: Runs the `execute` function directly
- `OPEN_MODAL`: Opens a modal window using ModalManager (requires modal route setup)

**Modal-based Plugin Example:**
```typescript
import type { Plugin } from '@/types';

export const colorPicker: Plugin = {
  id: 'color-picker',
  name: 'Color Picker',
  description: 'Pick colors from page',
  category: 'inspector',
  tier: 'free',
  version: '1.0.0',

  icon: (container) => {
    container.style.background = 'var(--plugin-color-picker)';
    container.innerHTML = '<svg>...</svg>';
  },

  onExecute: {
    type: 'OPEN_MODAL', // Opens modal automatically
    execute: (ctx) => {
      // Optional: Additional logic when modal opens
    },
  },

  shortcuts: {
    pickColor: {
      name: 'Pick Color',
      description: 'Pick color at cursor position',
      handler: async (event, ctx) => {
        // Open modal and trigger color picking
        const { modalManager } = await import('@/core/ModalManager');
        if (!modalManager.isOpen('color-picker')) {
          modalManager.openModal('color-picker');
        }
        // Dispatch custom event for modal to handle
        window.dispatchEvent(new CustomEvent('colorpicker:start'));
      }
    }
  }
};
```

**Triggering from Popup:**
```typescript
// In Popup Vue component
browser.runtime.sendMessage({
  type: 'EXECUTE_PLUGIN',
  pluginId: 'my-plugin'
});
```

## WXT Framework

WXT uses convention-based file structure where files in `entrypoints/` define extension parts:

- **background.ts**: Service worker (persistent background process)
- **content/index.ts**: Content script (runs on web pages)
- **popup/**: Popup UI (click extension icon)
- **options/**: Full-page settings

### WXT Configuration

The `wxt.config.ts` includes important customizations:

```typescript
hooks: {
  'build:manifestGenerated': async (wxt, manifest) => {
    // Customize manifest before build
    if (manifest.options_ui) {
      manifest.options_ui.open_in_tab = true; // Options page opens in new tab
    }
  }
}
```

**Important**:
- Keyboard shortcuts are handled via `keydown` listeners in content scripts, NOT via Chrome's Commands API
- Shortcut handlers run in Content Script context, so use `pluginManagerProxy`, NOT `PluginManager`

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
import { ShortcutManager, pluginManagerProxy } from '@/core';
import { allPlugins } from '@/plugins';

export default defineContentScript({
  matches: ['<all_urls>'],
  async main(ctx) {
    // IMPORTANT: Do NOT register plugins here! Background does that.
    // Content Script only activates plugins based on state from Background

    const activatedPlugins = new Map();

    // Query state from Background and activate enabled plugins
    for (const plugin of allPlugins) {
      const state = await pluginManagerProxy.getPluginState(plugin.id);

      if (state?.enabled && plugin.onActivate) {
        await plugin.onActivate(ctx);
        activatedPlugins.set(plugin.id, plugin);
      }
    }

    // Cleanup on invalidation (this tab only)
    ctx.onInvalidated(async () => {
      for (const plugin of activatedPlugins.values()) {
        if (plugin.onCleanup) {
          await plugin.onCleanup();
        }
      }
    });
  },
});
```

### Popup / Options (Vue)

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { pluginManagerProxy } from '@/core';

const plugins = ref([]);

onMounted(async () => {
  // Query plugins from Background via RPC
  plugins.value = await pluginManagerProxy.getPlugins();

  // Listen to real-time state changes
  pluginManagerProxy.addListener((state) => {
    console.log('State updated:', state);
    // Update UI reactively
  });
});

async function togglePlugin(pluginId: string) {
  // Send RPC to Background
  await pluginManagerProxy.togglePlugin(pluginId);
}
</script>
```

### Modal Views (Content Script)

For plugins with `onExecute.type: 'OPEN_MODAL'`, create a route in `entrypoints/content/router/index.ts`:

```typescript
import { createRouter, createMemoryHistory } from 'vue-router';
import ColorPickerView from '@/plugins/implementations/color-picker/ColorPickerView.vue';

const routes = [
  {
    path: '/color-picker',
    name: 'color-picker',
    component: ColorPickerView,
  },
  // Add more modal routes...
];

export default createRouter({
  history: createMemoryHistory(),
  routes,
});
```

Modal view components receive the plugin context and can communicate via:
- Custom events: `window.dispatchEvent(new CustomEvent('event-name', { detail }))`
- ModalManager: Access via `modalManager.isOpen()`, `modalManager.removeModal()`
- Plugin state: Access via `pluginManagerProxy.getPluginSettings('plugin-id')`

### Reusable Vue Components

The project includes reusable UI components in `/components/`:

- **`<ToggleSwitch>`**: Plugin enable/disable toggle switch
- **`<TierTag>`**: Free/Pro badge display
- **`<ShortcutBadge>`**: Display keyboard shortcuts with platform-specific formatting (⌘⇧P on Mac, Ctrl + Shift + P on Windows)

Usage:
```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import ToggleSwitch from '@/components/ToggleSwitch.vue';
import TierTag from '@/components/TierTag.vue';
import ShortcutBadge from '@/components/ShortcutBadge.vue';
import { pluginManagerProxy } from '@/core';

const enabled = ref(false);
const shortcutKeys = ref([]);

onMounted(async () => {
  // Query state from Background
  const state = await pluginManagerProxy.getPluginState('plugin-id');
  // Get user-configured shortcut keys from PluginState
  shortcutKeys.value = state?.shortcuts?.toggle?.keys || [];
  enabled.value = state?.enabled || false;
});
</script>

<template>
  <ToggleSwitch v-model="enabled" />
  <TierTag :tier="plugin.tier" />
  <ShortcutBadge v-if="shortcutKeys.length" :keys="shortcutKeys" />
</template>
```

## Message Passing Architecture

Browser extension contexts are isolated and communicate via `browser.runtime.sendMessage`:

### Popup/Options → Background → Content Script

**Toggle Plugin State:**
```typescript
// From Popup/Options
browser.runtime.sendMessage({
  type: 'TOGGLE_PLUGIN',
  pluginId: 'my-plugin'
});

// Background receives and updates state
browser.runtime.onMessage.addListener(async (message) => {
  if (message.type === 'TOGGLE_PLUGIN') {
    await manager.togglePlugin(message.pluginId);
  }
});
```

**Execute Plugin (One-Shot):**
```typescript
// From Popup/Options
browser.runtime.sendMessage({
  type: 'EXECUTE_PLUGIN',
  pluginId: 'my-plugin'
});

// Background forwards to active tab
const tabs = await browser.tabs.query({ active: true, currentWindow: true });
await browser.tabs.sendMessage(tabs[0].id, {
  type: 'EXECUTE_PLUGIN',
  pluginId: 'my-plugin'
});

// Content Script receives and executes
browser.runtime.onMessage.addListener((message) => {
  if (message.type === 'EXECUTE_PLUGIN') {
    manager.executePlugin(message.pluginId, ctx);
    // If onExecute.type === 'OPEN_MODAL', ModalManager opens the modal
  }
});
```

**Flow:**
```
Popup (User clicks)
  → sendMessage → Background (Routes message)
  → sendMessage → Content Script (Executes plugin)
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

  // One-shot execution (for popup clicks or shortcuts)
  onExecute?: {
    type: 'EXECUTE_PLUGIN' | 'OPEN_MODAL';
    execute: (ctx: ContentScriptContext) => void | Promise<void>;
  };

  settings?: Record<string, PluginSetting>;
  shortcuts?: Record<string, PluginShortcut>;
}

// Stored state
interface PluginState {
  enabled: boolean;
  settings: Record<string, any>;
  shortcuts: Record<string, ShortcutState>;
}

// Shortcut definition (in plugin)
interface PluginShortcut {
  name: string;
  description: string;
  handler: (event: KeyboardEvent, ctx: ContentScriptContext) => void | Promise<void>;
  // NOTE: No 'keys' field here! Keys are stored in PluginState.shortcuts
}

// Shortcut state (stored per shortcut in PluginState)
interface ShortcutState {
  keys?: ShortcutKey[]; // User-customized shortcut keys
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

**Important**: Shortcuts do NOT include `keys` in the plugin definition. Keys are stored in `PluginState.shortcuts` (user customization).

```typescript
// Define shortcuts (NO keys field in plugin definition)
shortcuts: {
  toggle: {
    name: 'Toggle Plugin',
    description: 'Toggle plugin on/off',
    handler: async (event, ctx) => {
      // IMPORTANT: Handlers run in Content Script context!
      // Use pluginManagerProxy, NOT PluginManager
      const { pluginManagerProxy } = await import('@/core');
      await pluginManagerProxy.togglePlugin('my-plugin');
    }
  }
}
```

**User registers shortcuts separately via PluginState:**
```typescript
// Stored in browser.storage.local
interface PluginState {
  enabled: boolean;
  settings: Record<string, any>;
  shortcuts: {
    toggle: {
      keys: ['Cmd', 'Shift', 'P'] // User-configured shortcut
    }
  }
}

// Valid modifier keys: 'Cmd', 'Shift', 'Alt', 'Ctrl'
// Regular keys: 'A'-'Z', '0'-'9', 'F1'-'F12', etc.
```

**Shortcut Keys Format:**
- `Cmd`: Auto-converts (Mac → Command, Windows → Ctrl)
- `Shift`: Shift key
- `Alt`: Alt/Option key
- `Ctrl`: Control key (explicitly Ctrl on both platforms)
- Regular keys: `'A'`, `'B'`, `'1'`, `'F1'`, etc.

## Business Model

- **Free Tier**: 4 core plugins (CSS Spy, Color Picker, Ruler, Grid Overlay)
- **Pro Tier**: 11 premium plugins

Plugins are marked with `tier: 'free' | 'pro'`.

## Important Rules

### DO:
- ✅ **Background**: Use `PluginManager.getInstance()`
- ✅ **Content/Popup/Options**: Use `pluginManagerProxy`
- ✅ Use `ModalManager` for modal-based plugins
- ✅ Follow the example plugin structure
- ✅ Provide cleanup logic in plugins (for `onActivate` plugins)
- ✅ Use TypeScript types from `@/types`
- ✅ Test on both Mac and Windows
- ✅ Use Vue Router for modal views in content scripts
- ✅ Import Vue composition API functions (`ref`, `onMounted`, etc.) in Vue components

### DON'T:
- ❌ **NEVER** use `PluginManager` in Content/Popup/Options (use `pluginManagerProxy`)
- ❌ **NEVER** call `register()` outside Background script
- ❌ Access `StorageManager` directly (use proxy/manager instead)
- ❌ Create new data structures without good reason
- ❌ Modify core modules (`core/`) unless refactoring
- ❌ Forget cleanup logic in `onActivate` plugins (causes memory leaks)
- ❌ Use emojis unless explicitly requested
- ❌ Hardcode platform-specific shortcuts (use abstracted format)
- ❌ Mix `onActivate` and `onExecute` in the same plugin (choose one pattern)

## Common Tasks

### Adding a new plugin:
1. Create `plugins/implementations/my-plugin/index.ts`
2. Define plugin following the `Plugin` interface
3. Import and register in `plugins/index.ts`
4. If using modals: Create modal view component and add route in `entrypoints/content/router/index.ts`

### Adding a modal-based plugin:
1. Create plugin with `onExecute.type: 'OPEN_MODAL'`
2. Create Vue component for modal view (e.g., `ColorPickerView.vue`)
3. Register route in `entrypoints/content/router/index.ts`:
   ```typescript
   {
     path: '/my-plugin',
     name: 'my-plugin',
     component: MyPluginView,
   }
   ```
4. Modal will auto-mount when plugin is executed

### Modifying plugin behavior:
1. Update plugin definition in `plugins/implementations/*/index.ts`
2. Changes are automatically picked up on reload

### Debugging:
```typescript
// In Background script:
const manager = PluginManager.getInstance();
const plugins = manager.getPlugins();
console.log('Registered plugins:', plugins);

// In Content/Popup/Options:
const plugins = await pluginManagerProxy.getPlugins();
const state = await pluginManagerProxy.getPluginState('plugin-id');
console.log('Plugin state:', state);
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

### New (Simple, Context-Aware):
```typescript
// In Background:
import { PluginManager } from '@/core';
const manager = PluginManager.getInstance();
const plugins = manager.getPlugins();
await manager.togglePlugin('id');

// In Content/Popup/Options:
import { pluginManagerProxy } from '@/core';
const plugins = await pluginManagerProxy.getPlugins();
const state = await pluginManagerProxy.getPluginState('id');
await pluginManagerProxy.togglePlugin('id');
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

**Remember**:
- **Context matters**: Background uses `PluginManager`, others use `pluginManagerProxy`
- **Single Source of Truth**: Only Background registers plugins and manages state
- **Content Script**: Queries state and activates plugins (this tab only)
- **Popup/Options**: Queries state and sends RPC commands to Background
- Follow the example plugin structure
