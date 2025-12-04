import type { Plugin } from '@/types';

export const assetSpyPlugin: Plugin = {
  // === Metadata ===
  id: 'asset-spy',
  name: 'Asset Spy',
  description: 'Collect and download images, SVGs, and CSS background images from any webpage',
  category: 'utility',
  version: '1.0.0',
  tier: 'free',

  // Icon
  icon: (container) => {
    container.style.background = 'var(--plugin-asset-spy, linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%))';
    container.className += ' plugin-icon';
    container.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="3" width="18" height="18" rx="2" stroke="white" stroke-width="2"/>
        <circle cx="8.5" cy="8.5" r="1.5" fill="white"/>
        <path d="M3 15L8 10L12 14L16 10L21 15V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V15Z" fill="white"/>
      </svg>
    `;
  },

  // === Settings ===
  settings: {
    showImages: {
      type: 'boolean',
      label: 'Show IMG tags',
      description: 'Collect images from <img> tags',
      defaultValue: true,
    },
    showSVG: {
      type: 'boolean',
      label: 'Show SVG elements',
      description: 'Collect inline SVG elements',
      defaultValue: true,
    },
    showBackgroundImages: {
      type: 'boolean',
      label: 'Show CSS backgrounds',
      description: 'Collect images from CSS background-image',
      defaultValue: true,
    },
    minSize: {
      type: 'number',
      label: 'Minimum size (px)',
      description: 'Ignore images smaller than this (width or height)',
      defaultValue: 1,
    },
  },

  // === Execute (Modal) ===
  onExecute: {
    type: 'OPEN_MODAL',
    execute: (ctx) => {
      console.log('[Asset Spy] Modal opened');
    },
  },
};
