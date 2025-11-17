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

- **`plugins/settings-manager.ts`**: The `SettingsManager` singleton
  - Handles plugin state persistence using `browser.storage.local`
  - Stores plugin enabled state, settings values, and shortcut customizations
  - Provides reactive listeners for settings changes across extension contexts
  - Initializes plugin settings on first registration

- **`plugins/plugin-helper.ts`**: Developer utilities for plugin authors
  - `createPluginExecutor()`: Abstracts common plugin logic (settings loading, change detection, shortcut handling)
  - `PluginHelpers`: Interface providing read-only settings access and helper methods
  - `matchesShortcut()`: Utility to match KeyboardEvent against shortcut strings

- **`plugins/implementations/index.ts`**: Plugin registration central point
  - Imports all plugin implementations
  - Calls `pluginRegistry.register()` for each plugin
  - Exports `initializePlugins()` function (called in background.ts and wxt.config.ts)

#### Creating a New Plugin

1. Create a new plugin file in `plugins/implementations/` (e.g., `my-plugin/index.ts`)
2. Define plugin metadata and use `createPluginExecutor` helper for cleaner code:

```typescript
import type { PluginMetaData } from '@/plugins/types';
import { createPluginExecutor } from '@/plugins/plugin-helper';

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
      defaultKey: { windows: 'Ctrl+Shift+P', mac: 'Command+Shift+P' },
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

3. Register the plugin in `plugins/implementations/index.ts`:
```typescript
import { myPlugin } from './my-plugin';
pluginRegistry.register(myPlugin);
```

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
- Loads and activates/deactivates plugins based on their enabled state
- Maintains `activePlugins` Map to track currently running plugins
- Listens for `UPDATE_PLUGIN` messages from background script
- Calls `plugin.execute(ctx)` on activation and `plugin.cleanup()` on deactivation
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

1. **SettingsManager** (`plugins/settings-manager.ts`):
   - Manages structured plugin configurations stored in `browser.storage.local`
   - Storage key: `prismify:settings`
   - Stores: plugin enabled state, settings values, shortcut customizations
   - Provides reactive listeners for settings changes across contexts
   - Schema: `{ plugins: { [pluginId]: PluginConfig } }`

2. **WXT Storage** (`wxt/storage`):
   - Used in background script for simpler key-value storage
   - Pattern: `local:plugin:{pluginId}` for boolean enabled states
   - This is synchronized with SettingsManager

**Note**: Both systems are kept in sync. Background script uses WXT storage for simplicity, while popup/options/content scripts use SettingsManager for structured access.

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

## Plugin Documentation

Comprehensive plugin development documentation is in `plugins/docs/`:
- `01-quick-start.md` - Getting started guide
- `02-plugin-structure.md` - Detailed structure explanation
- `03-settings.md` - Settings system
- `04-shortcuts.md` - Keyboard shortcuts
- `05-helpers-api.md` - Helper utilities
- `06-examples.md` - Example plugins