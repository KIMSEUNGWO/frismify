/**
 * Screen Reader Accessibility Analysis Utilities
 * Analyzes page structure for screen reader compatibility
 */

export interface HeadingInfo {
  level: number;
  text: string;
  element: HTMLElement;
  hasIssue: boolean;
  issueType?: 'empty' | 'skipped-level';
}

export interface ImageInfo {
  src: string;
  alt: string;
  element: HTMLImageElement;
  hasIssue: boolean;
  issueType?: 'missing-alt' | 'empty-alt' | 'generic-alt';
}

export interface FormInfo {
  type: string;
  label: string;
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  hasIssue: boolean;
  issueType?: 'missing-label' | 'empty-label';
}

export interface LinkInfo {
  href: string;
  text: string;
  element: HTMLAnchorElement;
  hasIssue: boolean;
  issueType?: 'empty-text' | 'generic-text' | 'no-href';
}

export interface AriaInfo {
  element: HTMLElement;
  role: string;
  label: string;
  hasIssue: boolean;
  issueType?: 'missing-label' | 'invalid-role';
}

export interface LandmarkInfo {
  type: string;
  element: HTMLElement;
  label?: string;
  hasIssue: boolean;
  issueType?: 'duplicate' | 'missing-label';
}

export interface ScreenReaderAnalysis {
  headings: HeadingInfo[];
  images: ImageInfo[];
  forms: FormInfo[];
  links: LinkInfo[];
  aria: AriaInfo[];
  landmarks: LandmarkInfo[];
  stats: {
    totalIssues: number;
    headingIssues: number;
    imageIssues: number;
    formIssues: number;
    linkIssues: number;
    ariaIssues: number;
    landmarkIssues: number;
  };
}

// Generic alt text patterns that should be flagged
const GENERIC_ALT_PATTERNS = ['image', 'picture', 'photo', 'img', 'icon', 'logo'];

// Generic link text patterns
const GENERIC_LINK_PATTERNS = ['click here', 'here', 'link', 'read more', 'more'];

// Valid ARIA roles
const VALID_ARIA_ROLES = [
  'alert', 'alertdialog', 'application', 'article', 'banner', 'button',
  'checkbox', 'columnheader', 'combobox', 'complementary', 'contentinfo',
  'definition', 'dialog', 'directory', 'document', 'feed', 'figure', 'form',
  'grid', 'gridcell', 'group', 'heading', 'img', 'link', 'list', 'listbox',
  'listitem', 'log', 'main', 'marquee', 'math', 'menu', 'menubar', 'menuitem',
  'menuitemcheckbox', 'menuitemradio', 'navigation', 'none', 'note', 'option',
  'presentation', 'progressbar', 'radio', 'radiogroup', 'region', 'row',
  'rowgroup', 'rowheader', 'scrollbar', 'search', 'searchbox', 'separator',
  'slider', 'spinbutton', 'status', 'switch', 'tab', 'table', 'tablist',
  'tabpanel', 'term', 'textbox', 'timer', 'toolbar', 'tooltip', 'tree',
  'treegrid', 'treeitem'
];

/**
 * Analyze page headings (h1-h6)
 */
export function analyzeHeadings(): HeadingInfo[] {
  const headings: HeadingInfo[] = [];
  const headingElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
  let previousLevel = 0;

  headingElements.forEach((el) => {
    const htmlEl = el as HTMLElement;
    const level = parseInt(el.tagName.substring(1));
    const text = htmlEl.textContent?.trim() || '';

    // Check for issues
    let hasIssue = false;
    let issueType: 'empty' | 'skipped-level' | undefined;

    // Empty heading
    if (!text) {
      hasIssue = true;
      issueType = 'empty';
    }

    // Skipped heading level (e.g., h1 -> h3, skipping h2)
    if (previousLevel > 0 && level > previousLevel + 1) {
      hasIssue = true;
      issueType = 'skipped-level';
    }

    headings.push({
      level,
      text: text || '(empty)',
      element: htmlEl,
      hasIssue,
      issueType,
    });

    previousLevel = level;
  });

  return headings;
}

/**
 * Analyze images for alt text
 */
export function analyzeImages(): ImageInfo[] {
  const images: ImageInfo[] = [];
  const imgElements = document.querySelectorAll('img');

  imgElements.forEach((img) => {
    const src = img.src || img.getAttribute('src') || '';
    const alt = img.alt || '';

    let hasIssue = false;
    let issueType: 'missing-alt' | 'empty-alt' | 'generic-alt' | undefined;

    // Missing alt attribute
    if (!img.hasAttribute('alt')) {
      hasIssue = true;
      issueType = 'missing-alt';
    }
    // Empty alt (could be intentional for decorative images)
    else if (alt === '') {
      // Check if image is likely decorative (parent has aria-hidden, etc.)
      const isDecorative = img.hasAttribute('aria-hidden') ||
                          img.closest('[aria-hidden="true"]') !== null;

      if (!isDecorative && src && !src.includes('spacer') && !src.includes('blank')) {
        hasIssue = true;
        issueType = 'empty-alt';
      }
    }
    // Generic alt text
    else if (GENERIC_ALT_PATTERNS.some(pattern =>
      alt.toLowerCase().includes(pattern) && alt.split(' ').length <= 2
    )) {
      hasIssue = true;
      issueType = 'generic-alt';
    }

    // Skip invisible images
    const styles = window.getComputedStyle(img);
    if (styles.display === 'none' || styles.visibility === 'hidden' || styles.opacity === '0') {
      return;
    }

    images.push({
      src: src.length > 60 ? src.substring(0, 60) + '...' : src,
      alt: alt || '(missing)',
      element: img,
      hasIssue,
      issueType,
    });
  });

  return images;
}

/**
 * Analyze form inputs for labels
 */
export function analyzeForms(): FormInfo[] {
  const forms: FormInfo[] = [];
  const formElements = document.querySelectorAll('input:not([type="hidden"]), textarea, select');

  formElements.forEach((el) => {
    const htmlEl = el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    const type = htmlEl.tagName.toLowerCase() === 'input'
      ? (htmlEl as HTMLInputElement).type
      : htmlEl.tagName.toLowerCase();

    // Skip buttons and submit inputs
    if (type === 'submit' || type === 'button' || type === 'reset') {
      return;
    }

    // Skip invisible elements
    const styles = window.getComputedStyle(htmlEl);
    if (styles.display === 'none' || styles.visibility === 'hidden') {
      return;
    }

    let label = '';
    let hasIssue = false;
    let issueType: 'missing-label' | 'empty-label' | undefined;

    // Try to find label
    const id = htmlEl.id;
    if (id) {
      const labelEl = document.querySelector(`label[for="${id}"]`);
      if (labelEl) {
        label = labelEl.textContent?.trim() || '';
      }
    }

    // Check for wrapping label
    if (!label) {
      const parentLabel = htmlEl.closest('label');
      if (parentLabel) {
        label = parentLabel.textContent?.trim() || '';
      }
    }

    // Check for aria-label or aria-labelledby
    if (!label) {
      label = htmlEl.getAttribute('aria-label') || '';
      if (!label) {
        const labelledBy = htmlEl.getAttribute('aria-labelledby');
        if (labelledBy) {
          const labelEl = document.getElementById(labelledBy);
          if (labelEl) {
            label = labelEl.textContent?.trim() || '';
          }
        }
      }
    }

    // Check for placeholder as fallback (not ideal but better than nothing)
    if (!label && htmlEl.hasAttribute('placeholder')) {
      label = `(placeholder: ${htmlEl.getAttribute('placeholder')})`;
    }

    // Issues
    if (!label) {
      hasIssue = true;
      issueType = 'missing-label';
      label = '(no label)';
    } else if (label.trim() === '') {
      hasIssue = true;
      issueType = 'empty-label';
    }

    forms.push({
      type,
      label,
      element: htmlEl,
      hasIssue,
      issueType,
    });
  });

  return forms;
}

/**
 * Analyze links for accessible text
 */
export function analyzeLinks(): LinkInfo[] {
  const links: LinkInfo[] = [];
  const linkElements = document.querySelectorAll('a');

  linkElements.forEach((link) => {
    const href = link.href || '';
    let text = link.textContent?.trim() || '';

    // Check for aria-label
    if (!text) {
      text = link.getAttribute('aria-label') || '';
    }

    // Check for title
    if (!text) {
      text = link.getAttribute('title') || '';
    }

    // Check for image alt inside link
    if (!text) {
      const img = link.querySelector('img');
      if (img) {
        text = img.alt || '';
      }
    }

    // Skip invisible links
    const styles = window.getComputedStyle(link);
    if (styles.display === 'none' || styles.visibility === 'hidden') {
      return;
    }

    let hasIssue = false;
    let issueType: 'empty-text' | 'generic-text' | 'no-href' | undefined;

    // No href
    if (!href || href === '#' || href === 'javascript:void(0)' || href === 'javascript:;') {
      hasIssue = true;
      issueType = 'no-href';
    }

    // Empty text
    if (!text) {
      hasIssue = true;
      issueType = 'empty-text';
      text = '(no text)';
    }
    // Generic text
    else if (GENERIC_LINK_PATTERNS.some(pattern =>
      text.toLowerCase() === pattern || text.toLowerCase().includes(pattern)
    )) {
      hasIssue = true;
      issueType = 'generic-text';
    }

    links.push({
      href: href.length > 60 ? href.substring(0, 60) + '...' : href,
      text,
      element: link,
      hasIssue,
      issueType,
    });
  });

  return links;
}

/**
 * Analyze ARIA usage
 */
export function analyzeAria(): AriaInfo[] {
  const ariaElements: AriaInfo[] = [];
  const elementsWithAria = document.querySelectorAll('[role], [aria-label], [aria-labelledby]');

  elementsWithAria.forEach((el) => {
    const htmlEl = el as HTMLElement;
    const role = htmlEl.getAttribute('role') || '';
    const ariaLabel = htmlEl.getAttribute('aria-label') || '';
    const ariaLabelledBy = htmlEl.getAttribute('aria-labelledby') || '';

    let label = ariaLabel;
    if (!label && ariaLabelledBy) {
      const labelEl = document.getElementById(ariaLabelledBy);
      if (labelEl) {
        label = labelEl.textContent?.trim() || '';
      }
    }

    // Skip invisible elements
    const styles = window.getComputedStyle(htmlEl);
    if (styles.display === 'none' || styles.visibility === 'hidden') {
      return;
    }

    let hasIssue = false;
    let issueType: 'missing-label' | 'invalid-role' | undefined;

    // Invalid role
    if (role && !VALID_ARIA_ROLES.includes(role)) {
      hasIssue = true;
      issueType = 'invalid-role';
    }

    // Missing label for certain roles
    if (role && ['button', 'link', 'checkbox', 'radio', 'textbox'].includes(role)) {
      if (!label && !htmlEl.textContent?.trim()) {
        hasIssue = true;
        issueType = 'missing-label';
      }
    }

    ariaElements.push({
      element: htmlEl,
      role: role || '(no role)',
      label: label || htmlEl.textContent?.trim().substring(0, 50) || '(no label)',
      hasIssue,
      issueType,
    });
  });

  return ariaElements;
}

/**
 * Analyze landmark regions
 */
export function analyzeLandmarks(): LandmarkInfo[] {
  const landmarks: LandmarkInfo[] = [];
  const landmarkElements = document.querySelectorAll(
    'header, nav, main, aside, footer, section, [role="banner"], [role="navigation"], [role="main"], [role="complementary"], [role="contentinfo"], [role="region"], [role="search"]'
  );

  const landmarkCounts: Record<string, number> = {};

  landmarkElements.forEach((el) => {
    const htmlEl = el as HTMLElement;
    const role = htmlEl.getAttribute('role');
    let type = '';

    // Determine landmark type
    if (role) {
      type = role;
    } else {
      const tagName = htmlEl.tagName.toLowerCase();
      switch (tagName) {
        case 'header': type = 'banner'; break;
        case 'nav': type = 'navigation'; break;
        case 'main': type = 'main'; break;
        case 'aside': type = 'complementary'; break;
        case 'footer': type = 'contentinfo'; break;
        case 'section': type = 'region'; break;
        default: type = tagName;
      }
    }

    // Skip invisible elements
    const styles = window.getComputedStyle(htmlEl);
    if (styles.display === 'none' || styles.visibility === 'hidden') {
      return;
    }

    // Count landmarks
    landmarkCounts[type] = (landmarkCounts[type] || 0) + 1;

    const ariaLabel = htmlEl.getAttribute('aria-label') || '';
    const ariaLabelledBy = htmlEl.getAttribute('aria-labelledby') || '';
    let label = ariaLabel;

    if (!label && ariaLabelledBy) {
      const labelEl = document.getElementById(ariaLabelledBy);
      if (labelEl) {
        label = labelEl.textContent?.trim() || '';
      }
    }

    let hasIssue = false;
    let issueType: 'duplicate' | 'missing-label' | undefined;

    // Multiple landmarks of same type should have labels
    if (landmarkCounts[type] > 1 && !label) {
      hasIssue = true;
      issueType = 'missing-label';
    }

    landmarks.push({
      type,
      element: htmlEl,
      label,
      hasIssue,
      issueType,
    });
  });

  // Mark duplicates
  Object.entries(landmarkCounts).forEach(([type, count]) => {
    if (count > 1) {
      landmarks.forEach((landmark) => {
        if (landmark.type === type && !landmark.label) {
          landmark.hasIssue = true;
          landmark.issueType = 'duplicate';
        }
      });
    }
  });

  return landmarks;
}

/**
 * Perform complete screen reader analysis
 */
export function analyzeScreenReaderAccessibility(): ScreenReaderAnalysis {
  const headings = analyzeHeadings();
  const images = analyzeImages();
  const forms = analyzeForms();
  const links = analyzeLinks();
  const aria = analyzeAria();
  const landmarks = analyzeLandmarks();

  const stats = {
    totalIssues: 0,
    headingIssues: headings.filter(h => h.hasIssue).length,
    imageIssues: images.filter(i => i.hasIssue).length,
    formIssues: forms.filter(f => f.hasIssue).length,
    linkIssues: links.filter(l => l.hasIssue).length,
    ariaIssues: aria.filter(a => a.hasIssue).length,
    landmarkIssues: landmarks.filter(l => l.hasIssue).length,
  };

  stats.totalIssues = stats.headingIssues + stats.imageIssues + stats.formIssues +
                      stats.linkIssues + stats.ariaIssues + stats.landmarkIssues;

  return {
    headings,
    images,
    forms,
    links,
    aria,
    landmarks,
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
