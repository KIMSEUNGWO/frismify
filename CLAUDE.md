# CLAUDE.md

Guidance for Claude Code when working with this repository.

## Project Overview

**Prismify** - Browser extension toolkit for frontend developers built with WXT and Vue 3. Plugin-based architecture with modular tools.

## Development Commands

```bash
npm run dev              # Chrome dev with hot reload
npm run dev:firefox      # Firefox dev
npm run build            # Production build for Chrome
npm run build:firefox    # Production build for Firefox
npm run compile          # TypeScript type checking
```

## Architecture

### Core Principles
1. **Facade Pattern**: Single entry point (`PluginManager`)
2. **Singleton Pattern**: Consistent instances across contexts
3. **Encapsulation**: Minimal public API
4. **Type Safety**: Full TypeScript coverage

### Project Structure

```
prismify/
├── core/                    # Core (DO NOT MODIFY unless refactoring)
│   ├── PluginManager.ts    # Background only
│   ├── PluginManagerProxy.ts # Content/Popup/Options
│   ├── ModalManager.ts     # Modal management
│   ├── ToastManager.ts     # Notifications
│   ├── ShortcutManager.ts  # Keyboard shortcuts
│   └── StorageManager.ts   # browser.storage wrapper
├── plugins/
│   ├── implementations/     # Plugin implementations
│   └── index.ts            # Registration
├── entrypoints/
│   ├── background.ts       # Service worker
│   ├── content/            # Content script + Vue modals
│   ├── popup/              # Extension popup
│   └── options/            # Settings page
├── components/             # Reusable Vue components
├── utils/                  # Utilities
└── types.ts                # Global types
```

## Core Modules

### PluginManager vs PluginManagerProxy

**CRITICAL**: Different contexts use different managers!

```typescript
// Background ONLY
import { PluginManager } from '@/core';
const manager = PluginManager.getInstance();
await manager.register(myPlugin);
await manager.togglePlugin('plugin-id');

// Content/Popup/Options
import { pluginManagerProxy } from '@/core';
const plugins = await pluginManagerProxy.getPlugins();
await pluginManagerProxy.togglePlugin('plugin-id');
```

**Rules:**
- ✅ Background: `PluginManager.getInstance()`
- ✅ Content/Popup/Options: `pluginManagerProxy`
- ❌ NEVER use `PluginManager` in Content/Popup/Options
- ❌ NEVER call `register()` outside Background

### Other Core Managers

```typescript
// ShortcutManager - keyboard shortcuts
import { ShortcutManager } from '@/core';
const shortcut = ShortcutManager.getInstance();
if (shortcut.matches(event, ['Cmd', 'Shift', 'P'])) { }

// ModalManager - modal windows
import { modalManager } from '@/core/ModalManager';
modalManager.openModal('plugin-id');
modalManager.removeModal('plugin-id');

// ToastManager - notifications
import { toastManager } from '@/core/ToastManager';
toastManager.success('Done!', 3000, 'plugin-id');
toastManager.error('Error!', 5000);
```

## Plugin Development

### Three Plugin Types

**1. PersistentPlugin** - Runs continuously when enabled

```typescript
import type { PersistentPlugin } from '@/types';

export const myPlugin: PersistentPlugin = {
  id: 'my-plugin',
  name: 'My Plugin',
  description: 'Description',
  category: 'design',
  version: '1.0.0',
  tier: 'free',
  icon: (container) => { /* render icon */ },

  onActivate: async (ctx) => {
    // Setup logic
  },

  onCleanup: () => {
    // Cleanup logic (REQUIRED!)
  },
};
```

**2. ExecutablePlugin** - One-shot execution

```typescript
import type { ExecutablePlugin } from '@/types';

export const myPlugin: ExecutablePlugin = {
  // ... metadata ...

  onExecute: async (ctx) => {
    // One-time execution
    const { toastManager } = await import('@/core/ToastManager');
    toastManager.success('Executed!', 3000, 'my-plugin');
  },
};
```

**3. ModalPlugin** - Opens modal UI

```typescript
import type { ModalPlugin } from '@/types';

export const myPlugin: ModalPlugin = {
  // ... metadata ...
  isModal: true,

  onOpen: async (ctx) => {
    // Optional: called when modal opens
  },

  onClose: async () => {
    // Optional: called when modal closes
  },
};
```

### Plugin Settings

```typescript
settings: {
  color: {
    type: 'color',
    label: 'Color',
    defaultValue: '#000000',
  },
  unit: {
    type: 'select',
    label: 'Unit',
    defaultValue: 'px',
    options: [
      { label: 'Pixels', value: 'px' },
      { label: 'Rem', value: 'rem' },
    ],
  },
}
```

### Keyboard Shortcuts

**IMPORTANT**: Keys are NOT in plugin definition. Stored in `PluginState.shortcuts`.

```typescript
shortcuts: {
  toggle: {
    name: 'Toggle Plugin',
    description: 'Toggle on/off',
    handler: async (event, ctx) => {
      // Runs in Content Script - use pluginManagerProxy!
      const { pluginManagerProxy } = await import('@/core');
      await pluginManagerProxy.togglePlugin('my-plugin');
    }
  }
}
```

### Registration

```typescript
// plugins/index.ts
import { PluginManager } from '@/core';
import { myPlugin } from './implementations/my-plugin';

export async function registerPlugins(): Promise<void> {
  const manager = PluginManager.getInstance();
  await manager.register(myPlugin);
}

export const allPlugins = [myPlugin];
```

## Type System

```typescript
// Base Plugin interface
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

// Three plugin patterns
interface PersistentPlugin extends Plugin {
  onActivate: (ctx: ContentScriptContext) => void | Promise<void>;
  onCleanup: () => void | Promise<void>;
}

interface ExecutablePlugin extends Plugin {
  onExecute: (ctx: ContentScriptContext) => void | Promise<void>;
}

interface ModalPlugin extends Plugin {
  isModal: true;
  onOpen?: (ctx: ContentScriptContext) => void | Promise<void>;
  onClose?: () => void | Promise<void>;
}

// Type guards
function isPersistentPlugin(plugin: Plugin): plugin is PersistentPlugin;
function isExecutablePlugin(plugin: Plugin): plugin is ExecutablePlugin;
function isModalPlugin(plugin: Plugin): plugin is ModalPlugin;
```

## WXT Framework

Convention-based file structure:
- **background.ts**: Service worker
- **content/index.ts**: Content script (runs on pages)
- **popup/**: Extension popup
- **options/**: Settings page

### Content Script Pattern

```typescript
import { pluginManagerProxy } from '@/core';
import { allPlugins } from '@/plugins';

export default defineContentScript({
  matches: ['<all_urls>'],
  async main(ctx) {
    // Query state from Background and activate enabled plugins
    for (const plugin of allPlugins) {
      const state = await pluginManagerProxy.getPluginState(plugin.id);
      if (state?.enabled && plugin.onActivate) {
        await plugin.onActivate(ctx);
      }
    }
  },
});
```

## Utilities

```typescript
// Platform detection
import { Platform } from '@/utils/platform';
const platform = Platform.getInstance();
if (platform.isMac) { }

// Settings helpers
import { getSettingWithFallback } from '@/utils/settings';
const color = getSettingWithFallback(plugin, state, 'color');

// Path aliases
import { PluginManager } from '@/core';
import type { Plugin } from '@/types';
```

## Important Rules

### DO:
- ✅ **Background**: Use `PluginManager.getInstance()`
- ✅ **Content/Popup/Options**: Use `pluginManagerProxy`
- ✅ Use correct plugin type: `PersistentPlugin`, `ExecutablePlugin`, or `ModalPlugin`
- ✅ Use type guards for type checking
- ✅ Provide cleanup logic in `PersistentPlugin`
- ✅ Use `ModalManager` for modals
- ✅ Use `ToastManager` for notifications

### DON'T:
- ❌ **NEVER** use `PluginManager` in Content/Popup/Options
- ❌ **NEVER** call `register()` outside Background
- ❌ Forget cleanup logic (causes memory leaks)
- ❌ Access `StorageManager` directly
- ❌ Modify core modules unless refactoring

## Common Tasks

### Add PersistentPlugin
1. Create `plugins/implementations/my-plugin/index.ts`
2. Define with `PersistentPlugin` interface
3. Implement `onActivate` and `onCleanup`
4. Register in `plugins/index.ts`

### Add ExecutablePlugin
1. Create plugin file
2. Define with `ExecutablePlugin` interface
3. Implement `onExecute`
4. Register in `plugins/index.ts`

### Add ModalPlugin
1. Create plugin file with `isModal: true`
2. Create Vue component for modal
3. Register route in `entrypoints/content/router/index.ts`
4. Register in `plugins/index.ts`

### Access Settings
```typescript
const { pluginManagerProxy } = await import('@/core');
const plugin = await pluginManagerProxy.getPlugin('my-plugin');
const state = await pluginManagerProxy.getPluginState('my-plugin');
const color = getSettingWithFallback(plugin, state, 'color');
```

### Debug
```typescript
// Background
const manager = PluginManager.getInstance();
console.log('Plugins:', manager.getPlugins());

// Content/Popup/Options
const plugins = await pluginManagerProxy.getPlugins();
const state = await pluginManagerProxy.getPluginState('plugin-id');
console.log('State:', state);
```

## Current Plugins

| Plugin | Type | Category | Tier |
|--------|------|----------|------|
| color-picker | ModalPlugin | inspector | free |
| asset-spy | ModalPlugin | utility | free |
| image-converter | ModalPlugin | utility | free |
| ruler | PersistentPlugin | design | free |
| copy-breaker | ExecutablePlugin | utility | free |

---

**Remember**:
- **Context matters**: Background uses `PluginManager`, others use `pluginManagerProxy`
- **Single Source of Truth**: Only Background registers plugins
- Follow plugin type interfaces strictly
