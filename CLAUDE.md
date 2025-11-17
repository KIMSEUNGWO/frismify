# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **Prismify**, a browser extension built with WXT and Vue 3. The product name means "프론트엔드 개발자를 위한 올인원 툴킷" (Frontend Dev Toolkit). The extension uses a **plugin architecture** where developer tools are implemented as modular plugins that can be enabled/disabled individually and controlled via keyboard shortcuts.

The name "Prismify" combines "Prism" (viewing web pages through multiple perspectives like a prism refracts light) with "-ify" (to make/transform).

## Development Commands

### Running the Extension
```bash
npm run dev              # Chrome development mode with hot reload
npm run dev:firefox      # Firefox development mode
```

### Building
```bash
npm run build            # Production build for Chrome
npm run build:firefox    # Production build for Firefox
npm run zip              # Create distributable zip for Chrome
npm run zip:firefox      # Create distributable zip for Firefox
```

### Type Checking
```bash
npm run compile          # Run TypeScript compiler without emitting files
```

## Architecture

### Core Design Principle: Abstraction

The most important architectural principle is **abstraction**. All plugins follow a standardized interface defined in `plugins/types.ts`. This enables:
- Consistent plugin behavior across the extension
- Easy addition/removal of plugins without modifying core code
- Future plugin marketplace where third-party developers can contribute
- Rapid development of new features

### Plugin System

This extension uses a **centralized plugin registry** pattern. All plugins must be registered through the `PluginRegistry` singleton to be available in the extension.

#### Core Plugin Files

- **`plugins/types.ts`**: TypeScript interfaces for plugins
  - `Plugin`: Main plugin interface
  - `PluginMetaData`: Plugin metadata (id, name, description, icon, shortcuts, settings)
  - `PluginConfig`: Stored configuration (enabled state, settings values, shortcut customizations)
  - `PluginShortcut`: Shortcut definition with platform-specific keys
  - `PluginSettingOption`: Setting schema (type, default, options)

- **`plugins/registry.ts`**: The `PluginRegistry` singleton
  - Manages all plugin registration and lookup
  - Generates Chrome Commands API manifest from plugin shortcuts
  - Provides filtering methods (by category, tier, enabled state)
  - Parses command names to extract pluginId and shortcutId (uses `__` delimiter)

- **`utils/settings-manager.ts`**: The `SettingsManager` singleton
  - Handles plugin state persistence using `browser.storage.local`
  - Stores plugin enabled state, settings values, and shortcut customizations
  - Provides reactive listeners for settings changes across extension contexts
  - Initializes plugin settings on first registration

- **`utils/plugin-helper.ts`**: Developer utilities for plugin authors
  - `createPluginExecutor()`: Abstracts common plugin logic (settings loading, change detection, shortcut handling)
  - `PluginHelpers`: Interface providing read-only settings access, platform info, and helper methods
  - Provides access to global `platform` singleton for OS detection

- **`utils/localStorage.ts`**: Type-safe storage wrapper
  - Singleton wrapper around `browser.storage.local`
  - Centralized storage key management via `STORAGE_KEYS` constant
  - Provides type-safe methods: `get()`, `set()`, `remove()`, `getMultiple()`, `setMultiple()`
  - Helper methods: `getPluginEnabled()`, `setPluginEnabled()`, `getAppSettings()`, `setAppSettings()`

- **`utils/platform.ts`**: Platform detection singleton
  - `Platform` class: Singleton for OS detection and metadata
  - Provides `platform.isMac`, `platform.isWindows`, `platform.isLinux`, `platform.type`, `platform.name`
  - Used globally across the extension for platform-specific behavior

- **`utils/shortcut-utils.ts`**: Keyboard shortcut utilities
  - Abstracts shortcuts using `ShortcutKey[]` format (e.g., `['Cmd', 'Shift', 'P']`)
  - Converts to platform-specific formats: Mac symbols (`⌘⇧P`) or Windows text (`Ctrl + Shift + P`)
  - `formatShortcutForDisplay()`: Display shortcuts with platform-appropriate formatting
  - `toCommandShortcut()`: Convert to Chrome Commands API format
  - `matchesShortcut()`: Match KeyboardEvent against shortcut arrays

- **`plugins/implementations/index.ts`**: Plugin implementations directory
  - Contains all plugin implementations in subdirectories
  - Each plugin exports its implementation from `index.ts`
  - Exports array of all plugins via `plugins` constant

- **`plugins/index.ts`**: Plugin registration central point
  - Imports all plugins from `plugins/implementations`
  - Calls `pluginRegistry.register()` for each plugin
  - Initializes plugin settings via `settingsManager.initializePlugin()`
  - Main entry point for plugin system

#### Creating a New Plugin

1. Create a new plugin file in `plugins/implementations/` (e.g., `my-plugin/index.ts`)
2. Define plugin metadata and use `createPluginExecutor` helper for cleaner code:

```typescript
import type { Plugin, PluginMetaData } from '@/plugins/types';
import { createPluginExecutor } from '@/utils/plugin-helper';

const meta: PluginMetaData = {
  id: 'my-plugin',
  name: 'My Plugin',
  description: 'Description here',
  drawIcon: (div) => {
    div.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    div.innerHTML = '<svg>...</svg>';
    return div;
  },
  category: 'inspector' | 'performance' | 'design' | 'utility',
  version: '0.0.1',
  tier: 'free' | 'pro',
  shortcuts: [
    {
      id: 'toggle',
      name: 'Toggle Plugin',
      description: 'Enable or disable the plugin',
      key: ['Cmd', 'Shift', 'P'],  // Abstracted shortcut format
      enabled: true
    }
  ],
  settingOptions: [
    {
      id: 'option1',
      name: 'Option 1',
      description: 'Description',
      type: 'boolean',
      defaultValue: true
    }
  ]
};

export const myPlugin: Plugin = {
  meta,
  matches: ['<all_urls>'],
  runAt: 'document_idle',

  // Use createPluginExecutor to handle common logic automatically
  execute: createPluginExecutor('my-plugin', {
    onActivate: (helpers) => {
      // Access settings: helpers.settings.option1
      // Your plugin logic here
    },
    onSettingsChange: (helpers) => {
      // React to settings changes
    },
    onCleanup: () => {
      // Cleanup logic
    }
  })
};
```

3. Add the plugin to the export array in `plugins/implementations/index.ts`:
```typescript
import { myPlugin } from './my-plugin';

export const plugins = [
  cssSpyPlugin,
  imageSpyPlugin,
  myPlugin,  // Add your plugin here
  // ... other plugins
];
```

The plugin will be automatically registered and initialized when imported in `plugins/index.ts`.

**See `plugins/implementations/css-spy.example.ts` for a complete reference implementation.**

### WXT Framework Structure

WXT uses a **convention-based file structure** where files in the `entrypoints/` directory define different parts of the extension:

#### Background Script (`entrypoints/background.ts`)
- Service worker that initializes plugins via `initializePlugins()`
- Listens to keyboard shortcuts via `browser.commands.onCommand`
- Toggles plugin state in storage (`local:plugin:{pluginId}`)
- Broadcasts `UPDATE_PLUGIN` messages to all content scripts
- Shows browser notifications on plugin toggle
- Handles `TOGGLE_PLUGIN` messages from popup/options

**Important**: The background script parses command names using `__` as delimiter (e.g., `css-spy__toggle-inspector`)

#### Content Scripts (`entrypoints/content/index.ts`)
- Main content script that runs on all pages (`<all_urls>`)
- Uses `ActivePlugins` class (defined in `entrypoints/content/types.ts`) to manage plugin lifecycle
- Maintains `activePlugins` Map to track currently running plugins with their cleanup functions
- Loads and activates/deactivates plugins based on their enabled state
- Listens for `UPDATE_PLUGIN` messages from background script
- Calls `plugin.execute(ctx)` on activation and stores cleanup callback
- Manages plugin lifecycle using `ContentScriptContext`
- Cleans up all plugins when context is invalidated

#### Popup (`entrypoints/popup/`)
Quick access UI for toggling plugins:
- `App.vue` - Main popup component
- `components/PluginCard.vue` - Individual plugin toggle card
- Sends `TOGGLE_PLUGIN` messages to background script

#### Options Page (`entrypoints/options/`)
Full settings page with Vue Router:
- `App.vue` - Main options app with sidebar navigation
- `router/index.ts` - Vue Router configuration
- `pages/DashboardView.vue` - Usage statistics dashboard
- `pages/ToolsView.vue` - Plugin management and settings
- `pages/ShortcutsView.vue` - Keyboard shortcut customization
- `components/PluginSettings.vue` - Individual plugin settings UI
- `components/ShortcutSettings.vue` - Shortcut editing UI
- `components/MenuView.vue` - Sidebar menu component

### State Management

The extension uses a **dual storage system**:

1. **SettingsManager** (`utils/settings-manager.ts`):
   - Manages structured plugin configurations stored in `browser.storage.local`
   - Storage key: `appSettings` (defined in `utils/localStorage.ts`)
   - Stores: plugin enabled state, settings values, shortcut customizations
   - Provides reactive listeners for settings changes across contexts
   - Schema: `{ plugins: { [pluginId]: PluginConfig } }`

2. **localStorage Wrapper** (`utils/localStorage.ts`):
   - Type-safe wrapper around `browser.storage.local`
   - Used in background script for simpler key-value storage
   - Pattern: `local:plugin:{pluginId}` for boolean enabled states (generated via `STORAGE_KEYS.pluginEnabled()`)
   - Main storage key: `STORAGE_KEYS.APP_SETTINGS = 'appSettings'`
   - Both systems synchronized through SettingsManager

**Note**: Both systems are kept in sync. Background script uses localStorage wrapper for simple boolean checks, while popup/options/content scripts use SettingsManager for structured access. SettingsManager uses localStorage wrapper internally.

### Message Passing

Chrome extension message passing patterns:

- **Background → Content Scripts**: `{ type: 'UPDATE_PLUGIN', pluginId, enabled }`
  - Sent when keyboard shortcuts are triggered or plugins are toggled
  - Broadcast to all tabs (excluding chrome:// and edge:// URLs)

- **Popup/Options → Background**: `{ type: 'TOGGLE_PLUGIN', pluginId, enabled }`
  - Sent when user manually toggles a plugin in the UI

### Vue 3 Integration

- Uses Vue 3 with TypeScript via `@wxt-dev/module-vue` module
- All Vue components use Composition API with `<script setup>`
- Vue Router for options page navigation
- Reactive data binding with `ref` and `computed`

### Path Aliases

TypeScript is configured with path alias `@/*` pointing to project root:
```typescript
import { pluginRegistry } from '@/plugins/registry';
import type { Plugin } from '@/plugins/types';
```

**Note**: `wxt.config.ts` sets up Vite alias for `@` to `/src`, but WXT auto-generated `.wxt/tsconfig.json` maps it to project root.

### Manifest Generation

The `wxt.config.ts` file dynamically generates the manifest:
- Defines extension permissions (`storage`, `activeTab`, `scripting`, `tabs`)
- Sets `host_permissions: ['<all_urls>']`
- Auto-generates keyboard shortcut commands via `pluginRegistry.getCommands()`
- Configures options page to open in a new tab (`open_in_tab: true`)

**Build Hook**: `build:manifestGenerated` hook imports the plugin registry and injects commands into manifest dynamically.

### Auto-Generated Files

The `.wxt/` directory contains auto-generated configuration:
- `.wxt/tsconfig.json` - TypeScript config (extends this in root tsconfig.json)
- Do not edit these files directly - they're regenerated by `wxt prepare` (runs on postinstall)

### Browser APIs

Use the global `browser` object for WebExtension APIs (WXT provides TypeScript types):
```typescript
browser.runtime.id
browser.storage.local.get()
browser.tabs.query()
browser.commands.onCommand.addListener()
```

### Platform Detection

Use the global `platform` singleton from `utils/platform.ts`:
```typescript
import { platform } from '@/utils/platform';

// Check platform
platform.isMac       // boolean
platform.isWindows   // boolean
platform.isLinux     // boolean
platform.type        // 'mac' | 'windows' | 'linux' | 'unknown'
platform.name        // 'macOS' | 'Windows' | 'Linux' | 'Unknown'

// Helper functions (backward compatibility)
import { isMac, isWindows, isLinux } from '@/utils/platform';
```

### Keyboard Shortcuts

Shortcuts use an **abstracted format** that automatically converts to platform-specific representations:

#### Defining Shortcuts
```typescript
// In plugin metadata
shortcuts: [{
  id: 'toggle',
  key: ['Cmd', 'Shift', 'P']  // Abstracted format
}]

// Valid modifier keys: 'Cmd', 'Shift', 'Alt', 'Ctrl'
// Regular keys: 'A'-'Z', '0'-'9', 'F1'-'F12', etc.
```

#### Storage Format
Custom shortcuts are stored in **Chrome Commands API compatible format**:
```typescript
// PluginConfig.shortcuts[shortcutId].customKey
{
  windows: 'Ctrl+Shift+P',      // Text format
  mac: 'Command+Shift+P'         // Text format (NOT symbols!)
}
```

#### Display Format
Shortcuts are displayed with platform-appropriate formatting:
```typescript
import { formatShortcutForDisplay } from '@/utils/shortcut-utils';

formatShortcutForDisplay(['Cmd', 'Shift', 'P'])
// Mac:     ⌘⇧P           (symbols, compact)
// Windows: Ctrl + Shift + P  (text with spaces)
```

#### Conversion Utilities
```typescript
import {
  toMacShortcut,         // ['Cmd', 'Shift', 'P'] → '⌘⇧P'
  toWindowsShortcut,     // ['Cmd', 'Shift', 'P'] → 'Ctrl+Shift+P'
  toMacShortcutText,     // ['Cmd', 'Shift', 'P'] → 'Command+Shift+P' (API format)
  toCommandShortcut,     // Generate {windows, mac} object for Chrome API
  matchesShortcut        // Check if KeyboardEvent matches shortcut
} from '@/utils/shortcut-utils';
```

## Business Model & Tiers

The extension has a freemium model:

- **Free Tier**: 4 core plugins (CSS Spy, Color Picker, Ruler, Grid Overlay)
- **Pro Tier**: Additional 11 premium plugins

Plugins are marked with `tier: 'free' | 'pro'` in their metadata. See `PLUGIN.md` for the complete plugin roadmap and `PRODUCE.md` for business strategy.

## Plugin Development Best Practices

1. **Use `createPluginExecutor()`**: Let the framework handle settings, shortcuts, and change detection
2. **Follow naming conventions**: Use `{plugin-id}__{shortcut-id}` for command names
3. **Provide cleanup logic**: Always implement cleanup to prevent memory leaks
4. **Settings are read-only**: Access via `helpers.settings`, never mutate directly
5. **Test across contexts**: Ensure plugin works in popup, options, and content script contexts
6. **Respect enabled state**: Plugin logic should only run when enabled via SettingsManager
7. **Use categories**: Group related plugins (`inspector`, `performance`, `design`, `utility`)
8. **Use abstracted shortcuts**: Define shortcuts as `['Cmd', 'Shift', 'Key']` arrays, not platform-specific strings
9. **Use platform singleton**: Access `helpers.platform` or `import { platform }` for OS detection

## Plugin Documentation

Comprehensive plugin development documentation is in `plugins/docs/`:
- `01-quick-start.md` - Getting started guide
- `02-plugin-structure.md` - Detailed structure explanation
- `03-settings.md` - Settings system
- `04-shortcuts.md` - Keyboard shortcuts
- `05-helpers-api.md` - Helper utilities
- `06-examples.md` - Example plugins