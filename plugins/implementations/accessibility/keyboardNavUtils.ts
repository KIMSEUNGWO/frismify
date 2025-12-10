/**
 * Keyboard Navigation Accessibility Analysis Utilities
 * Analyzes page for keyboard-only navigation accessibility
 */

export interface FocusableElement {
  element: HTMLElement;
  tagName: string;
  text: string;
  tabIndex: number;
  hasFocusStyle: boolean;
  hasIssue: boolean;
  issueType?: 'no-focus-style' | 'negative-tabindex' | 'unreachable';
}

export interface InteractiveElement {
  element: HTMLElement;
  tagName: string;
  text: string;
  hasIssue: boolean;
  issueType?: 'not-focusable' | 'no-keyboard-handler';
}

export interface SkipLink {
  element: HTMLAnchorElement;
  text: string;
  href: string;
  isVisible: boolean;
  hasIssue: boolean;
  issueType?: 'invalid-target' | 'always-hidden';
}

export interface TabOrderIssue {
  element: HTMLElement;
  tagName: string;
  text: string;
  tabIndex: number;
  issueType: 'positive-tabindex' | 'skipped-order';
}

export interface KeyboardNavAnalysis {
  focusableElements: FocusableElement[];
  interactiveElements: InteractiveElement[];
  skipLinks: SkipLink[];
  tabOrderIssues: TabOrderIssue[];
  stats: {
    totalIssues: number;
    focusableCount: number;
    focusStyleIssues: number;
    interactiveIssues: number;
    skipLinkIssues: number;
    tabOrderIssues: number;
  };
}

/**
 * Check if element has visible focus style
 */
function hasFocusStyle(element: HTMLElement): boolean {
  // Create a hidden clone to test focus styles
  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.position = 'absolute';
  clone.style.left = '-9999px';
  clone.style.top = '-9999px';
  document.body.appendChild(clone);

  // Get computed styles before and after focus
  const beforeFocus = window.getComputedStyle(clone);
  const beforeOutline = beforeFocus.outline;
  const beforeOutlineWidth = beforeFocus.outlineWidth;
  const beforeOutlineColor = beforeFocus.outlineColor;
  const beforeBoxShadow = beforeFocus.boxShadow;
  const beforeBorder = beforeFocus.border;
  const beforeBackground = beforeFocus.backgroundColor;

  // Simulate focus
  clone.focus();
  const afterFocus = window.getComputedStyle(clone);
  const afterOutline = afterFocus.outline;
  const afterOutlineWidth = afterFocus.outlineWidth;
  const afterOutlineColor = afterFocus.outlineColor;
  const afterBoxShadow = afterFocus.boxShadow;
  const afterBorder = afterFocus.border;
  const afterBackground = afterFocus.backgroundColor;

  // Clean up
  document.body.removeChild(clone);

  // Check if any focus style changed
  const hasOutlineChange = beforeOutline !== afterOutline ||
                          beforeOutlineWidth !== afterOutlineWidth ||
                          beforeOutlineColor !== afterOutlineColor;
  const hasBoxShadowChange = beforeBoxShadow !== afterBoxShadow;
  const hasBorderChange = beforeBorder !== afterBorder;
  const hasBackgroundChange = beforeBackground !== afterBackground;

  // If outline is explicitly set to none, that's a problem
  if (afterOutlineWidth === '0px' || afterOutline.includes('none')) {
    // Check if there are other focus indicators
    return hasBoxShadowChange || hasBorderChange || hasBackgroundChange;
  }

  return hasOutlineChange || hasBoxShadowChange || hasBorderChange || hasBackgroundChange;
}

/**
 * Get text content from element
 */
function getElementText(element: HTMLElement): string {
  // Check aria-label first
  let text = element.getAttribute('aria-label') || '';

  // Check text content
  if (!text) {
    text = element.textContent?.trim() || '';
  }

  // Check alt for images
  if (!text && element.tagName === 'IMG') {
    text = (element as HTMLImageElement).alt || '';
  }

  // Check title
  if (!text) {
    text = element.getAttribute('title') || '';
  }

  // Check value for inputs
  if (!text && (element.tagName === 'INPUT' || element.tagName === 'BUTTON')) {
    text = (element as HTMLInputElement).value || '';
  }

  // Truncate if too long
  if (text.length > 50) {
    text = text.substring(0, 50) + '...';
  }

  return text || `<${element.tagName.toLowerCase()}>`;
}

/**
 * Check if element is visible
 */
function isVisible(element: HTMLElement): boolean {
  const styles = window.getComputedStyle(element);
  if (styles.display === 'none' || styles.visibility === 'hidden' || styles.opacity === '0') {
    return false;
  }

  // Check if element has dimensions
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) {
    return false;
  }

  return true;
}

/**
 * Analyze focusable elements
 */
export function analyzeFocusableElements(): FocusableElement[] {
  const focusableElements: FocusableElement[] = [];

  // Standard focusable elements
  const selector = 'a[href], button, input, select, textarea, [tabindex], [contenteditable="true"]';
  const elements = document.querySelectorAll(selector);

  elements.forEach((el) => {
    const element = el as HTMLElement;

    // Skip hidden elements
    if (!isVisible(element)) {
      return;
    }

    // Skip disabled elements
    if ((element as any).disabled) {
      return;
    }

    const tagName = element.tagName.toLowerCase();
    const text = getElementText(element);
    const tabIndex = element.tabIndex;
    const focusStyle = hasFocusStyle(element);

    let hasIssue = false;
    let issueType: 'no-focus-style' | 'negative-tabindex' | 'unreachable' | undefined;

    // Check for focus style
    if (!focusStyle) {
      hasIssue = true;
      issueType = 'no-focus-style';
    }

    // Check for negative tabindex (not in tab order)
    if (tabIndex < 0) {
      hasIssue = true;
      issueType = 'negative-tabindex';
    }

    focusableElements.push({
      element,
      tagName,
      text,
      tabIndex,
      hasFocusStyle: focusStyle,
      hasIssue,
      issueType,
    });
  });

  return focusableElements;
}

/**
 * Analyze interactive elements that should be keyboard accessible
 */
export function analyzeInteractiveElements(): InteractiveElement[] {
  const interactiveElements: InteractiveElement[] = [];
  const allElements = document.querySelectorAll('*');

  allElements.forEach((el) => {
    const element = el as HTMLElement;

    // Skip if already focusable
    const isFocusable = element.matches('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (isFocusable) {
      return;
    }

    // Skip hidden elements
    if (!isVisible(element)) {
      return;
    }

    // Check if element has click handler
    const hasClickHandler = element.onclick !== null ||
                           element.getAttribute('onclick') !== null ||
                           element.style.cursor === 'pointer';

    // Check if element has role that implies interactivity
    const role = element.getAttribute('role');
    const interactiveRoles = ['button', 'link', 'checkbox', 'radio', 'tab', 'menuitem', 'option'];
    const hasInteractiveRole = role && interactiveRoles.includes(role);

    if (!hasClickHandler && !hasInteractiveRole) {
      return;
    }

    const tagName = element.tagName.toLowerCase();
    const text = getElementText(element);

    let hasIssue = false;
    let issueType: 'not-focusable' | 'no-keyboard-handler' | undefined;

    // If it has click handler but not focusable, it's an issue
    if (hasClickHandler || hasInteractiveRole) {
      hasIssue = true;
      issueType = 'not-focusable';
    }

    interactiveElements.push({
      element,
      tagName,
      text,
      hasIssue,
      issueType,
    });
  });

  return interactiveElements;
}

/**
 * Analyze skip links
 */
export function analyzeSkipLinks(): SkipLink[] {
  const skipLinks: SkipLink[] = [];
  const links = document.querySelectorAll('a[href^="#"]');

  links.forEach((link) => {
    const element = link as HTMLAnchorElement;
    const text = getElementText(element);
    const href = element.getAttribute('href') || '';

    // Check if it's a skip link (usually first few links in the page)
    const isSkipLink = text.toLowerCase().includes('skip') ||
                      text.toLowerCase().includes('jump') ||
                      href === '#main' ||
                      href === '#content' ||
                      href === '#main-content';

    if (!isSkipLink) {
      return;
    }

    const visible = isVisible(element);

    let hasIssue = false;
    let issueType: 'invalid-target' | 'always-hidden' | undefined;

    // Check if target exists
    const targetId = href.substring(1);
    const target = document.getElementById(targetId);
    if (!target) {
      hasIssue = true;
      issueType = 'invalid-target';
    }

    // Check if link is always hidden (should be visible on focus)
    if (!visible) {
      // This might be intentional (show on focus), but flag it
      hasIssue = true;
      issueType = 'always-hidden';
    }

    skipLinks.push({
      element,
      text,
      href,
      isVisible: visible,
      hasIssue,
      issueType,
    });
  });

  return skipLinks;
}

/**
 * Analyze tab order issues
 */
export function analyzeTabOrderIssues(): TabOrderIssue[] {
  const issues: TabOrderIssue[] = [];
  const elements = document.querySelectorAll('[tabindex]');

  elements.forEach((el) => {
    const element = el as HTMLElement;

    // Skip hidden elements
    if (!isVisible(element)) {
      return;
    }

    const tabIndex = element.tabIndex;
    const tagName = element.tagName.toLowerCase();
    const text = getElementText(element);

    // Positive tabindex is generally bad practice
    if (tabIndex > 0) {
      issues.push({
        element,
        tagName,
        text,
        tabIndex,
        issueType: 'positive-tabindex',
      });
    }
  });

  return issues;
}

/**
 * Perform complete keyboard navigation analysis
 */
export function analyzeKeyboardNavigation(): KeyboardNavAnalysis {
  const focusableElements = analyzeFocusableElements();
  const interactiveElements = analyzeInteractiveElements();
  const skipLinks = analyzeSkipLinks();
  const tabOrderIssues = analyzeTabOrderIssues();

  const stats = {
    totalIssues: 0,
    focusableCount: focusableElements.length,
    focusStyleIssues: focusableElements.filter(e => e.issueType === 'no-focus-style').length,
    interactiveIssues: interactiveElements.filter(e => e.hasIssue).length,
    skipLinkIssues: skipLinks.filter(s => s.hasIssue).length,
    tabOrderIssues: tabOrderIssues.length,
  };

  stats.totalIssues = stats.focusStyleIssues + stats.interactiveIssues +
                     stats.skipLinkIssues + stats.tabOrderIssues;

  return {
    focusableElements,
    interactiveElements,
    skipLinks,
    tabOrderIssues,
    stats,
  };
}

/**
 * Highlight element on page
 */
export function highlightElement(element: HTMLElement) {
  // Remove any existing highlights
  removeHighlights();

  // Scroll to element
  element.scrollIntoView({ behavior: 'smooth', block: 'center' });

  // Add highlight
  const originalOutline = element.style.outline;
  const originalOutlineOffset = element.style.outlineOffset;
  const originalZIndex = element.style.zIndex;

  element.style.outline = '3px solid #667eea';
  element.style.outlineOffset = '2px';
  element.style.zIndex = '999999';

  element.setAttribute('data-prismify-highlighted', 'true');

  // Store original values for restoration
  element.setAttribute('data-prismify-original-outline', originalOutline);
  element.setAttribute('data-prismify-original-outline-offset', originalOutlineOffset);
  element.setAttribute('data-prismify-original-z-index', originalZIndex);

  // Focus the element
  element.focus();

  // Auto-remove after 3 seconds
  setTimeout(() => {
    removeHighlights();
  }, 3000);
}

/**
 * Remove all highlights
 */
export function removeHighlights() {
  const highlighted = document.querySelectorAll('[data-prismify-highlighted]');
  highlighted.forEach((el) => {
    const htmlEl = el as HTMLElement;
    htmlEl.style.outline = htmlEl.getAttribute('data-prismify-original-outline') || '';
    htmlEl.style.outlineOffset = htmlEl.getAttribute('data-prismify-original-outline-offset') || '';
    htmlEl.style.zIndex = htmlEl.getAttribute('data-prismify-original-z-index') || '';

    htmlEl.removeAttribute('data-prismify-highlighted');
    htmlEl.removeAttribute('data-prismify-original-outline');
    htmlEl.removeAttribute('data-prismify-original-outline-offset');
    htmlEl.removeAttribute('data-prismify-original-z-index');
  });
}

/**
 * Show tab order overlays on all focusable elements
 */
export function showTabOrderOverlays(): void {
  removeTabOrderOverlays();

  const selector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  const elements = Array.from(document.querySelectorAll(selector)) as HTMLElement[];

  // Sort by tab order
  const sorted = elements
    .filter(el => isVisible(el))
    .sort((a, b) => {
      const aIndex = a.tabIndex || 0;
      const bIndex = b.tabIndex || 0;

      // Positive tabindex comes first
      if (aIndex > 0 && bIndex <= 0) return -1;
      if (bIndex > 0 && aIndex <= 0) return 1;
      if (aIndex > 0 && bIndex > 0) return aIndex - bIndex;

      // Otherwise, DOM order (which we approximate with appearance)
      return 0;
    });

  sorted.forEach((element, index) => {
    const rect = element.getBoundingClientRect();
    const overlay = document.createElement('div');

    overlay.className = 'prismify-tab-order-overlay';
    overlay.textContent = (index + 1).toString();
    overlay.style.cssText = `
      position: fixed;
      top: ${rect.top + window.scrollY}px;
      left: ${rect.left + window.scrollX}px;
      width: 24px;
      height: 24px;
      background: #667eea;
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: bold;
      z-index: 999999;
      pointer-events: none;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    `;

    document.body.appendChild(overlay);
  });
}

/**
 * Remove tab order overlays
 */
export function removeTabOrderOverlays(): void {
  const overlays = document.querySelectorAll('.prismify-tab-order-overlay');
  overlays.forEach(overlay => overlay.remove());
}
