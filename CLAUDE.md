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
│   ├── PluginManager.ts    # Facade for all plugin operations (Background only)
│   ├── PluginManagerProxy.ts # RPC proxy (Content/Popup/Options)
│   ├── ModalManager.ts     # Modal window management with stacking
│   ├── ToastManager.ts     # Toast notification system
│   ├── ShortcutManager.ts  # Keyboard shortcut handling
│   ├── StorageManager.ts   # browser.storage.local wrapper
│   ├── InstanceManager.ts  # Message type enum definitions
│   ├── OptionsUtils.ts     # Settings page opener helper
│   └── index.ts            # Public exports
│
├── plugins/                 # Plugin system
│   ├── implementations/     # Individual plugin implementations
│   │   ├── color-picker/   # ModalPlugin - Color picker
│   │   ├── asset-spy/      # ModalPlugin - Asset collector
│   │   ├── image-converter/ # ModalPlugin - Image format converter
│   │   ├── ruler/          # PersistentPlugin - Ruler tool
│   │   └── copy-breaker/   # ExecutablePlugin - Remove copy protection
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
├── components/             # Reusable Vue components
│   ├── ToggleSwitch.vue   # Enable/disable toggle
│   ├── TierTag.vue        # Free/Pro badge
│   └── ShortcutBadge.vue  # Platform-specific shortcut display
│
├── utils/                  # Utilities
│   ├── platform.ts         # OS detection (Mac/Windows/Linux)
│   └── settings.ts         # Plugin settings helper functions
│
├── shared/                 # Shared resources
│   ├── success.svg         # Toast icon
│   ├── error.svg           # Toast icon
│   ├── warning.svg         # Toast icon
│   └── info.svg            # Toast icon
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

Manages modal windows with support for multiple modals and automatic stacking.

```typescript
import { modalManager } from '@/core/ModalManager';

// Open modal for a plugin
modalManager.openModal('plugin-id');

// Remove specific modal
modalManager.removeModal('plugin-id');

// Remove all modals
modalManager.removeAllModals();

// Check if modal is open
if (modalManager.isOpen('plugin-id')) {
  // Modal is open for this plugin
}

// Get all open modals
const openModals = modalManager.getOpenModals(); // Returns string[]

// Check if any modal is open
if (modalManager.isAnyOpen()) {
  // Some modal is open
}
```

**Modal Stacking Features:**
- Multiple modals can be open simultaneously
- Auto-arranged vertically from top-right corner
- Bring-to-front on re-open with highlight animation
- Each modal gets unique z-index and position
- Dispatches `CustomEvent('modalStackChange')` when stack changes
- ModalPlugins can use `onOpen` and `onClose` lifecycle hooks

**Modal Architecture:**
- Modals are Vue apps mounted in the content script context
- Each modal has its own route via Vue Router
- Modal component is defined in `entrypoints/content/App.vue`
- Modal views are defined in plugin-specific routes
- Modals are draggable and auto-snap to viewport boundaries

### ToastManager

Display toast notifications with plugin icons and auto-dismiss.

```typescript
import { toastManager } from '@/core/ToastManager';

// Show toast notifications
toastManager.success('Operation completed!', 3000, 'plugin-id');
toastManager.error('Something went wrong', 5000);
toastManager.info('Information message', 3000);
toastManager.warning('Warning message', 4000);

// Toast with plugin icon
toastManager.success('Ruler activated', 2000, 'ruler');
```

**Toast Features:**
- Four types: success, error, info, warning
- Auto-dismiss after specified duration (default: 3000ms)
- Hover to pause auto-dismiss timer
- Optional plugin icon rendering
- Appears in bottom-right corner
- Icons from `/shared/*.svg` (success, error, warning, info)
- Multiple toasts stack vertically

**Parameters:**
```typescript
toastManager.success(message: string, duration?: number, pluginId?: string)
toastManager.error(message: string, duration?: number, pluginId?: string)
toastManager.info(message: string, duration?: number, pluginId?: string)
toastManager.warning(message: string, duration?: number, pluginId?: string)
```

## Plugin Development

### Creating a New Plugin

1. Create directory in `plugins/implementations/`
2. Create `index.ts` with plugin definition
3. Register in `plugins/index.ts`

### Plugin Patterns

Choose the appropriate pattern based on your plugin's behavior:

#### 1. PersistentPlugin - Continuous Execution

Use for plugins that need to run continuously when enabled (e.g., rulers, overlays, inspectors).

```typescript
// plugins/implementations/ruler/index.ts

import type { PersistentPlugin } from '@/types';

export const ruler: PersistentPlugin = {
  // === Metadata ===
  id: 'ruler',
  name: 'Ruler',
  description: 'Measure distances on page',
  category: 'design',
  version: '1.0.0',
  tier: 'free',

  // Icon render function
  icon: (container) => {
    container.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    container.innerHTML = '<svg>...</svg>';
  },

  // === Settings Schema ===
  settings: {
    unit: {
      type: 'select',
      label: 'Unit',
      defaultValue: 'px',
      options: [
        { label: 'Pixels', value: 'px' },
        { label: 'Rem', value: 'rem' },
      ],
    },
  },

  // === Shortcuts ===
  shortcuts: {
    toggle: {
      name: 'Toggle Ruler',
      description: 'Toggle ruler on/off',
      handler: async (event, ctx) => {
        const { pluginManagerProxy } = await import('@/core');
        await pluginManagerProxy.togglePlugin('ruler');
      },
    },
  },

  // === Lifecycle (Required for PersistentPlugin) ===
  onActivate: async (ctx) => {
    // Plugin activation logic - runs when plugin is enabled
    const overlay = document.createElement('div');
    overlay.id = 'ruler-overlay';
    overlay.className = 'ruler-container';
    document.body.appendChild(overlay);

    // Add event listeners, initialize state, etc.
  },

  onCleanup: () => {
    // Cleanup logic - runs when plugin is disabled
    document.getElementById('ruler-overlay')?.remove();
  },
};
```

#### 2. ExecutablePlugin - One-Shot Execution

Use for plugins that execute once on-demand (e.g., copy-breaker, screenshot).

```typescript
// plugins/implementations/copy-breaker/index.ts

import type { ExecutablePlugin } from '@/types';

export const copyBreaker: ExecutablePlugin = {
  id: 'copy-breaker',
  name: 'Copy Breaker',
  description: 'Remove copy protection',
  category: 'utility',
  version: '1.0.0',
  tier: 'free',

  icon: (container) => {
    container.style.background = 'var(--plugin-copy-breaker)';
    container.innerHTML = '<svg>...</svg>';
  },

  // === Shortcuts ===
  shortcuts: {
    execute: {
      name: 'Execute Copy Breaker',
      description: 'Remove copy protection from page',
      handler: async (event, ctx) => {
        // Special 'execute' shortcut - triggers plugin execution
        const { pluginManagerProxy } = await import('@/core');
        // Trigger will execute the onExecute function
      },
    },
  },

  // === Execution (Required for ExecutablePlugin) ===
  onExecute: async (ctx) => {
    // One-time execution logic
    document.body.style.userSelect = 'auto';
    document.querySelectorAll('*').forEach(el => {
      (el as HTMLElement).style.userSelect = 'auto';
    });

    // Show toast notification
    const { toastManager } = await import('@/core/ToastManager');
    toastManager.success('Copy protection removed!', 3000, 'copy-breaker');
  },
};
```

#### 3. ModalPlugin - Modal Window

Use for plugins that need a UI overlay (e.g., color-picker, asset-spy).

```typescript
// plugins/implementations/color-picker/index.ts

import type { ModalPlugin } from '@/types';

export const colorPicker: ModalPlugin = {
  id: 'color-picker',
  name: 'Color Picker',
  description: 'Pick colors from page',
  category: 'inspector',
  version: '1.0.0',
  tier: 'free',
  isModal: true, // Required for ModalPlugin

  icon: (container) => {
    container.style.background = 'var(--plugin-color-picker)';
    container.innerHTML = '<svg>...</svg>';
  },

  // === Shortcuts ===
  shortcuts: {
    pickColor: {
      name: 'Pick Color',
      description: 'Open color picker',
      handler: async (event, ctx) => {
        const { modalManager } = await import('@/core/ModalManager');
        if (!modalManager.isOpen('color-picker')) {
          modalManager.openModal('color-picker');
        }
      },
    },
  },

  // === Modal Lifecycle (Optional) ===
  onOpen: async (ctx) => {
    // Called when modal opens
    console.log('Color picker modal opened');
  },

  onClose: async () => {
    // Called when modal closes
    console.log('Color picker modal closed');
  },
};
```

**Creating Modal View Component:**

```vue
<!-- plugins/implementations/color-picker/ColorPickerView.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { modalManager } from '@/core/ModalManager';

const selectedColor = ref('#000000');

function pickColor() {
  // Color picking logic
}

function close() {
  modalManager.removeModal('color-picker');
}

onMounted(() => {
  // Initialize modal
});
</script>

<template>
  <div class="color-picker-modal">
    <h3>Color Picker</h3>
    <div class="color-display" :style="{ background: selectedColor }"></div>
    <button @click="pickColor">Pick Color</button>
    <button @click="close">Close</button>
  </div>
</template>
```

**Register Modal Route:**

```typescript
// entrypoints/content/router/index.ts
import ColorPickerView from '@/plugins/implementations/color-picker/ColorPickerView.vue';

const routes = [
  {
    path: '/color-picker',
    name: 'color-picker',
    component: ColorPickerView,
  },
];
```

### Registering Plugins

```typescript
// plugins/index.ts

import { PluginManager } from '@/core';
import { ruler } from './implementations/ruler';
import { copyBreaker } from './implementations/copy-breaker';
import { colorPicker } from './implementations/color-picker';

export async function registerPlugins(): Promise<void> {
  const manager = PluginManager.getInstance();

  await manager.register(ruler);
  await manager.register(copyBreaker);
  await manager.register(colorPicker);

  console.log(`[Plugins] ${manager.getPluginCount()} plugins registered`);
}

// Export for content script use
export const allPlugins = [ruler, copyBreaker, colorPicker];
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

### Using Type Guards

Use type guard functions to check plugin types at runtime:

```typescript
import { isPersistentPlugin, isExecutablePlugin, isModalPlugin } from '@/types';
import type { Plugin } from '@/types';

function handlePlugin(plugin: Plugin) {
  if (isPersistentPlugin(plugin)) {
    // TypeScript knows plugin has onActivate and onCleanup
    await plugin.onActivate(ctx);
  }

  if (isExecutablePlugin(plugin)) {
    // TypeScript knows plugin has onExecute
    await plugin.onExecute(ctx);
  }

  if (isModalPlugin(plugin)) {
    // TypeScript knows plugin has isModal, onOpen, onClose
    if (plugin.onOpen) {
      await plugin.onOpen(ctx);
    }
  }
}
```

**When to use:**
- In content script when activating plugins based on type
- When implementing generic plugin handling logic
- When you need TypeScript to narrow the plugin type

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

All types are defined in `types.ts`. The type system uses a hierarchical pattern with three core plugin types:

### Plugin Type Hierarchy

```typescript
// Base Plugin interface (all plugins extend this)
interface Plugin {
  id: string;
  name: string;
  description: string;
  category: 'inspector' | 'performance' | 'design' | 'utility';
  version: string;
  tier: 'free' | 'pro';
  icon: (container: HTMLDivElement) => void;
  settings?: Record<string, PluginSetting>;
  shortcuts?: Record<string, PluginShortcut>;
}

// Three plugin patterns:

// 1. PersistentPlugin - Runs continuously when enabled
interface PersistentPlugin extends Plugin {
  onActivate: (ctx: ContentScriptContext) => void | Promise<void>;
  onCleanup: () => void | Promise<void>;
}

// 2. ExecutablePlugin - Executes once on-demand
interface ExecutablePlugin extends Plugin {
  onExecute: (ctx: ContentScriptContext) => void | Promise<void>;
}

// 3. ModalPlugin - Opens modal window
interface ModalPlugin extends Plugin {
  isModal: true;
  onOpen?: (ctx: ContentScriptContext) => void | Promise<void>;
  onClose?: () => void | Promise<void>;
}

// Plugins can combine patterns:
interface PersistentExecutablePlugin extends PersistentPlugin, ExecutablePlugin {}
interface PersistentModalPlugin extends PersistentPlugin, ModalPlugin {}

// Type guard functions
function isPersistentPlugin(plugin: Plugin): plugin is PersistentPlugin;
function isExecutablePlugin(plugin: Plugin): plugin is ExecutablePlugin;
function isModalPlugin(plugin: Plugin): plugin is ModalPlugin;
```

### State and Shortcuts

```typescript
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

### Message Type System

```typescript
// All message types for RPC communication
enum MessageType {
  GET_PLUGIN_LIST = 'GET_PLUGIN_LIST',
  GET_PLUGIN = 'GET_PLUGIN',
  GET_PLUGIN_STATE = 'GET_PLUGIN_STATE',
  GET_PLUGIN_STATES = 'GET_PLUGIN_STATES',
  GET_PLUGIN_SETTINGS = 'GET_PLUGIN_SETTINGS',
  TOGGLE_PLUGIN = 'TOGGLE_PLUGIN',
  ENABLE_PLUGIN = 'ENABLE_PLUGIN',
  DISABLE_PLUGIN = 'DISABLE_PLUGIN',
  UPDATE_SETTING = 'UPDATE_SETTING',
  OPEN_MODAL = 'OPEN_MODAL',
  EXECUTE_PLUGIN = 'EXECUTE_PLUGIN',
  DOWNLOAD_IMAGE = 'DOWNLOAD_IMAGE',
  GET_FILE_SIZE = 'GET_FILE_SIZE',
}
```

## Path Aliases

TypeScript is configured with `@/*` alias pointing to project root:

```typescript
import { PluginManager } from '@/core';
import type { Plugin } from '@/types';
import { Platform } from '@/utils/platform';
```

## Utilities

### Platform Detection

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

### Settings Helpers

The `settings.ts` utility provides convenient functions for accessing plugin settings:

```typescript
import {
  getSetting,
  getSettingWithFallback,
  getSettingSchema,
  getDefaultValue,
  getAllSettings,
  getAllDefaultSettings,
  getSettingsWithSchema,
  hasSetting
} from '@/utils/settings';
import type { Plugin, PluginState } from '@/types';

// Get a specific setting value
const color = getSetting(pluginState, 'color'); // any | undefined

// Get setting with fallback to default value
const color = getSettingWithFallback(plugin, pluginState, 'color'); // Returns defaultValue if not set

// Get setting schema definition
const schema = getSettingSchema(plugin, 'color'); // PluginSetting | undefined

// Get default value from schema
const defaultColor = getDefaultValue(plugin, 'color'); // any | undefined

// Get all current settings
const settings = getAllSettings(pluginState); // Record<string, any>

// Get all default settings
const defaults = getAllDefaultSettings(plugin); // Record<string, any>

// Get settings with their schemas
const withSchema = getSettingsWithSchema(plugin, pluginState);
// Returns: Record<string, { value: any; schema: PluginSetting }>

// Check if setting exists
if (hasSetting(plugin, 'color')) {
  // Setting is defined in plugin
}
```

**When to use:**
- Use `getSettingWithFallback()` when you need a guaranteed value
- Use `getSetting()` when you need to check if a setting was explicitly set
- Use `getAllDefaultSettings()` when initializing plugin state
- Use `hasSetting()` before accessing settings to avoid errors

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

- **Free Tier**: 5 core plugins
  - Color Picker (ModalPlugin)
  - Asset Spy (ModalPlugin)
  - Image Converter (ModalPlugin)
  - Ruler (PersistentPlugin)
  - Copy Breaker (ExecutablePlugin)

- **Pro Tier**: Premium plugins (planned)

Plugins are marked with `tier: 'free' | 'pro'`.

### Current Plugin Status

| Plugin ID | Type | Category | Tier | Status |
|-----------|------|----------|------|--------|
| color-picker | ModalPlugin | inspector | free | Active |
| asset-spy | ModalPlugin | utility | free | Active |
| image-converter | ModalPlugin | utility | free | Active |
| ruler | PersistentPlugin | design | free | Active |
| copy-breaker | ExecutablePlugin | utility | free | Active |

## Important Rules

### DO:
- ✅ **Background**: Use `PluginManager.getInstance()`
- ✅ **Content/Popup/Options**: Use `pluginManagerProxy`
- ✅ Use the correct plugin type: `PersistentPlugin`, `ExecutablePlugin`, or `ModalPlugin`
- ✅ Use type guards (`isPersistentPlugin`, `isExecutablePlugin`, `isModalPlugin`) for type checking
- ✅ Use `ModalManager` for modal-based plugins (ModalPlugin)
- ✅ Use `ToastManager` for user notifications
- ✅ Use `@/utils/settings` helpers for accessing plugin settings
- ✅ Follow the plugin pattern examples
- ✅ Provide cleanup logic in `PersistentPlugin` (required for onActivate)
- ✅ Use TypeScript types from `@/types`
- ✅ Test on both Mac and Windows
- ✅ Use Vue Router for modal views in content scripts
- ✅ Import Vue composition API functions (`ref`, `onMounted`, etc.) in Vue components
- ✅ Use `MessageType` enum for RPC communication

### DON'T:
- ❌ **NEVER** use `PluginManager` in Content/Popup/Options (use `pluginManagerProxy`)
- ❌ **NEVER** call `register()` outside Background script
- ❌ **NEVER** use the old `onExecute: { type, execute }` pattern (use plugin type interfaces)
- ❌ Access `StorageManager` directly (use proxy/manager instead)
- ❌ Create new data structures without good reason
- ❌ Modify core modules (`core/`) unless refactoring
- ❌ Forget cleanup logic in `PersistentPlugin` (causes memory leaks)
- ❌ Use emojis unless explicitly requested
- ❌ Hardcode platform-specific shortcuts (use abstracted format)
- ❌ Mix plugin patterns incorrectly (use type-safe interfaces)

## Common Tasks

### Adding a PersistentPlugin:
1. Create `plugins/implementations/my-plugin/index.ts`
2. Define plugin with `PersistentPlugin` interface
3. Implement `onActivate` and `onCleanup` lifecycle methods
4. Import and register in `plugins/index.ts`
5. Add to `allPlugins` export array

```typescript
import type { PersistentPlugin } from '@/types';

export const myPlugin: PersistentPlugin = {
  // ... metadata ...
  onActivate: async (ctx) => {
    // Setup logic
  },
  onCleanup: () => {
    // Cleanup logic (REQUIRED!)
  },
};
```

### Adding an ExecutablePlugin:
1. Create `plugins/implementations/my-plugin/index.ts`
2. Define plugin with `ExecutablePlugin` interface
3. Implement `onExecute` method
4. Add `execute` shortcut if needed (triggers plugin execution)
5. Import and register in `plugins/index.ts`

```typescript
import type { ExecutablePlugin } from '@/types';

export const myPlugin: ExecutablePlugin = {
  // ... metadata ...
  shortcuts: {
    execute: {
      name: 'Execute Plugin',
      description: 'Execute this plugin',
      handler: async (event, ctx) => {
        // Execution logic or trigger onExecute
      },
    },
  },
  onExecute: async (ctx) => {
    // One-time execution logic
    const { toastManager } = await import('@/core/ToastManager');
    toastManager.success('Executed!', 3000, 'my-plugin');
  },
};
```

### Adding a ModalPlugin:
1. Create `plugins/implementations/my-plugin/index.ts`
2. Define plugin with `ModalPlugin` interface, set `isModal: true`
3. Create Vue component for modal view (e.g., `MyPluginView.vue`)
4. Register route in `entrypoints/content/router/index.ts`
5. Import and register in `plugins/index.ts`
6. Optional: Implement `onOpen` and `onClose` lifecycle hooks

```typescript
import type { ModalPlugin } from '@/types';

export const myPlugin: ModalPlugin = {
  // ... metadata ...
  isModal: true,
  onOpen: async (ctx) => {
    // Called when modal opens (optional)
  },
  onClose: async () => {
    // Called when modal closes (optional)
  },
};
```

**Modal Route:**
```typescript
// entrypoints/content/router/index.ts
import MyPluginView from '@/plugins/implementations/my-plugin/MyPluginView.vue';

const routes = [
  {
    path: '/my-plugin',
    name: 'my-plugin',
    component: MyPluginView,
  },
];
```

### Modifying plugin behavior:
1. Update plugin definition in `plugins/implementations/*/index.ts`
2. Changes are automatically picked up on reload
3. If changing plugin type, update type interface accordingly

### Using ToastManager in plugins:
```typescript
import { toastManager } from '@/core/ToastManager';

// Success notification
toastManager.success('Plugin activated!', 3000, 'plugin-id');

// Error notification
toastManager.error('Something went wrong', 5000);

// Info notification
toastManager.info('Tip: Use Cmd+Shift+P', 4000);

// Warning notification
toastManager.warning('Feature experimental', 3000);
```

### Accessing plugin settings:
```typescript
import { getSettingWithFallback } from '@/utils/settings';
import { pluginManagerProxy } from '@/core';

// In plugin lifecycle methods
const plugin = await pluginManagerProxy.getPlugin('my-plugin');
const state = await pluginManagerProxy.getPluginState('my-plugin');

const color = getSettingWithFallback(plugin, state, 'color'); // Returns default if not set
```

### Debugging:
```typescript
// In Background script:
const manager = PluginManager.getInstance();
const plugins = manager.getPlugins();
console.log('Registered plugins:', plugins);

// In Content/Popup/Options:
import { pluginManagerProxy } from '@/core';
const plugins = await pluginManagerProxy.getPlugins();
const state = await pluginManagerProxy.getPluginState('plugin-id');
console.log('Plugin state:', state);

// Check plugin type
import { isPersistentPlugin, isExecutablePlugin, isModalPlugin } from '@/types';
if (isPersistentPlugin(plugin)) {
  console.log('This is a persistent plugin');
}
```

### Clearing storage:
```typescript
// Background script only
import { StorageManager } from '@/core';
const storage = StorageManager.getInstance();
await storage.clear(); // WARNING: Deletes all data!
```

## Migration Guide (Old → New Architecture)

If you encounter old code:

### Old Plugin Type Pattern (Deprecated):
```typescript
// OLD: Using onExecute with type field
export const myPlugin: Plugin = {
  // ... metadata ...
  onExecute: {
    type: 'EXECUTE_PLUGIN',
    execute: async (ctx) => {
      // Execution logic
    },
  },
};
```

### New Plugin Type Pattern (Current):
```typescript
// NEW: Using typed plugin interfaces
import type { ExecutablePlugin } from '@/types';

export const myPlugin: ExecutablePlugin = {
  // ... metadata ...
  onExecute: async (ctx) => {
    // Execution logic
  },
};
```

### Old Manager Pattern (Deprecated):
```typescript
// OLD: Complex, multiple managers
import { pluginRegistry } from '@/plugins/registry';
import { settingsManager } from '@/utils/settings-manager';
import { localStorage } from '@/utils/localStorage';

const plugins = pluginRegistry.findAll();
await settingsManager.initialize();
const enabled = settingsManager.isPluginEnabled('id');
```

### New Manager Pattern (Current):
```typescript
// NEW: Context-aware single facade
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

### Key Migration Points:
1. **Plugin Types**: Use `PersistentPlugin`, `ExecutablePlugin`, `ModalPlugin` interfaces instead of base `Plugin` with optional fields
2. **Type Guards**: Use `isPersistentPlugin()`, `isExecutablePlugin()`, `isModalPlugin()` for type checking
3. **Settings**: Use `@/utils/settings` helpers instead of direct access
4. **Modals**: Use `ModalPlugin` interface with `isModal: true` instead of `onExecute.type: 'OPEN_MODAL'`
5. **Toasts**: Use `ToastManager` for notifications instead of alert/console
6. **Message Types**: Use `MessageType` enum instead of string literals

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
