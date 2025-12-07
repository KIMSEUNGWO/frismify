import type { ModalPlugin } from "@/types";

export const accessibilityPlugin: ModalPlugin = {
  id: 'accessibility',
  name: 'Accessibility',
  description: 'Test website accessibility for color blindness, screen readers, keyboard navigation, and more',
  category: 'utility',
  version: '1.0.0',
  tier: 'free',

  icon: (container) => {
    container.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    container.classList.add('plugin-icon');
    container.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="9" stroke="white" stroke-width="2"/>
        <path d="M12 8C10.3431 8 9 9.34315 9 11C9 12.6569 10.3431 14 12 14C13.6569 14 15 12.6569 15 11C15 9.34315 13.6569 8 12 8Z" fill="white"/>
        <path d="M12 14V20" stroke="white" stroke-width="2" stroke-linecap="round"/>
        <path d="M9 17L6 19" stroke="white" stroke-width="2" stroke-linecap="round"/>
        <path d="M15 17L18 19" stroke="white" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `;
  },

  isModal: true,

  shortcuts: {
    open: {
      name: 'Open Accessibility Tools',
      description: 'Open accessibility testing tools',
      handler: async (event, ctx) => {
        const { modalManager } = await import('@/core/ModalManager');
        if (!modalManager.isOpen('accessibility')) {
          modalManager.openModal('accessibility');
        }
      },
    },
  },
};