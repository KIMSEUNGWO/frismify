/**
 * Ruler Plugin
 *
 * A powerful measurement and inspection tool for designers and developers.
 *
 * Features:
 * - Measure mode: Drag to measure distances between points
 * - Inspect mode: Hover to inspect element box models (margin, padding, border)
 * - Snap to elements: Automatically snap to element edges
 * - Multiple units: px, rem
 * - Keyboard shortcuts: Toggle modes, snap, units
 *
 * @category design
 * @tier free
 */

import type {PersistentPlugin, Plugin} from '@/types';
import { RulerOverlay } from './RulerOverlay';

// Plugin instance (module-scoped singleton per tab)
let rulerInstance: RulerOverlay | null = null;

export const rulerPlugin: PersistentPlugin = {
  // === Metadata ===
  id: 'ruler',
  name: 'Ruler',
  description: 'Measure distances and inspect element box models with precision tools for designers and developers',
  category: 'design',
  version: '1.0.0',
  tier: 'free',

  // === Icon ===
  icon: (container) => {
    container.style.background = 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)';
    container.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- Ruler body -->
        <path d="M3 4C3 3.44772 3.44772 3 4 3H20C20.5523 3 21 3.44772 21 4V8C21 8.55228 20.5523 9 20 9H4C3.44772 9 3 8.55228 3 8V4Z"
              stroke="white" stroke-width="1.5" stroke-linecap="round"/>

        <!-- Ruler marks (small) -->
        <line x1="5" y1="5" x2="5" y2="7" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="7" y1="5" x2="7" y2="7" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="9" y1="5" x2="9" y2="7" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="13" y1="5" x2="13" y2="7" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="15" y1="5" x2="15" y2="7" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="17" y1="5" x2="17" y2="7" stroke="white" stroke-width="1.5" stroke-linecap="round"/>

        <!-- Ruler marks (large) -->
        <line x1="11" y1="4.5" x2="11" y2="7.5" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="19" y1="4.5" x2="19" y2="7.5" stroke="white" stroke-width="1.5" stroke-linecap="round"/>

        <!-- Measurement line -->
        <path d="M4 15L20 15" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-dasharray="2 2"/>
        <circle cx="4" cy="15" r="1.5" fill="white"/>
        <circle cx="20" cy="15" r="1.5" fill="white"/>

        <!-- Distance label -->
        <text x="12" y="13" fill="white" font-size="5" text-anchor="middle" font-family="monospace">16px</text>
      </svg>
    `;
  },

  // === Settings ===
  settings: {
    defaultMode: {
      type: 'select',
      label: 'Default Mode',
      description: 'Choose the default mode when activating ruler',
      defaultValue: 'measure',
      options: [
        { label: 'Measure (Drag to measure distances)', value: 'measure' },
        { label: 'Inspect (Hover to inspect elements)', value: 'inspect' },
      ],
    },
    snapToElements: {
      type: 'boolean',
      label: 'Snap to Elements',
      description: 'Automatically snap measurement points to element edges',
      defaultValue: true,
    },
    unit: {
      type: 'select',
      label: 'Measurement Unit',
      description: 'Default unit for displaying measurements',
      defaultValue: 'px',
      options: [
        { label: 'Pixels (px)', value: 'px' },
        { label: 'Rem (rem)', value: 'rem' },
      ],
    },
    lineColor: {
      type: 'string',
      label: 'Guide Line Color',
      description: 'Color for measurement lines and markers',
      defaultValue: '#3B82F6',
    },
  },

  // === Shortcuts ===
  shortcuts: {
    toggle: {
      name: 'Toggle Ruler',
      description: 'Toggle ruler measurement mode on/off',
      handler: async (event, ctx) => {
        // Shortcuts run in Content Script context - use proxy!
        const { pluginManagerProxy } = await import('@/core');
        await pluginManagerProxy.togglePlugin('ruler');
      },
    },
  },

  // === Lifecycle ===
  onActivate: async (ctx) => {
    // Create and initialize ruler overlay
    rulerInstance = new RulerOverlay('ruler');
    await rulerInstance.init();
  },

  onCleanup: () => {
    // Clean up ruler instance
    if (rulerInstance) {
      rulerInstance.destroy();
      rulerInstance = null;
    }
  },
};
