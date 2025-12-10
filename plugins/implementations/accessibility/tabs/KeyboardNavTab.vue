<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import {
  analyzeKeyboardNavigation,
  highlightElement,
  removeHighlights,
  showTabOrderOverlays,
  removeTabOrderOverlays,
  type KeyboardNavAnalysis,
  type FocusableElement,
  type InteractiveElement,
  type SkipLink,
  type TabOrderIssue,
} from '../keyboardNavUtils';

const isAnalyzed = ref(false);
const analysis = ref<KeyboardNavAnalysis | null>(null);
const selectedCategory = ref<'overview' | 'focusable' | 'interactive' | 'skip-links' | 'tab-order'>('overview');
const showTabOrder = ref(false);

const categories = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'focusable', label: 'Focusable', icon: '⌨️' },
  { id: 'interactive', label: 'Interactive', icon: '🖱️' },
  { id: 'skip-links', label: 'Skip Links', icon: '⏩' },
  { id: 'tab-order', label: 'Tab Order', icon: '🔢' },
] as const;

const startAnalysis = () => {
  console.log('[Accessibility] Starting keyboard navigation analysis...');
  analysis.value = analyzeKeyboardNavigation();
  isAnalyzed.value = true;
  console.log('[Accessibility] Analysis complete:', analysis.value);
};

const refreshAnalysis = () => {
  console.log('[Accessibility] Refreshing keyboard navigation analysis...');
  selectedCategory.value = 'overview';
  removeHighlights();
  if (showTabOrder.value) {
    removeTabOrderOverlays();
    showTabOrder.value = false;
  }
  analysis.value = analyzeKeyboardNavigation();
  console.log('[Accessibility] Analysis refreshed:', analysis.value);
};

const selectCategory = (category: typeof selectedCategory.value) => {
  selectedCategory.value = category;
  removeHighlights();
};

const handleElementClick = (element: HTMLElement) => {
  highlightElement(element);
};

const toggleTabOrder = () => {
  showTabOrder.value = !showTabOrder.value;
  if (showTabOrder.value) {
    showTabOrderOverlays();
  } else {
    removeTabOrderOverlays();
  }
};

const getIssueLabel = (issueType: string | undefined): string => {
  if (!issueType) return '';

  const labels: Record<string, string> = {
    'no-focus-style': 'No focus style',
    'negative-tabindex': 'Negative tabindex',
    'unreachable': 'Unreachable',
    'not-focusable': 'Not focusable',
    'no-keyboard-handler': 'No keyboard handler',
    'invalid-target': 'Invalid target',
    'always-hidden': 'Always hidden',
    'positive-tabindex': 'Positive tabindex',
    'skipped-order': 'Skipped order',
  };

  return labels[issueType] || issueType;
};

const getSeverityClass = (issueType: string | undefined): string => {
  if (!issueType) return '';

  const critical = ['not-focusable', 'invalid-target', 'no-focus-style'];
  const warning = ['positive-tabindex', 'negative-tabindex', 'always-hidden', 'no-keyboard-handler'];
  const info = ['unreachable', 'skipped-order'];

  if (critical.includes(issueType)) return 'critical';
  if (warning.includes(issueType)) return 'warning';
  if (info.includes(issueType)) return 'info';

  return '';
};

// Auto-analyze on mount
onMounted(() => {
  startAnalysis();
});

// Cleanup on unmount
onUnmounted(() => {
  removeHighlights();
  removeTabOrderOverlays();
});
</script>

<template>
  <div class="keyboard-nav-tab">
    <!-- Controls -->
    <div class="controls">
      <button
        class="refresh-button"
        @click="refreshAnalysis"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M1 4v6h6M23 20v-6h-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Refresh Analysis
      </button>
      <button
        class="tab-order-button"
        :class="{ active: showTabOrder }"
        @click="toggleTabOrder"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2"/>
          <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2"/>
          <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2"/>
          <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2"/>
        </svg>
        {{ showTabOrder ? 'Hide' : 'Show' }} Tab Order
      </button>
    </div>

    <!-- Category Tabs -->
    <div v-if="isAnalyzed && analysis" class="category-tabs">
      <button
        v-for="category in categories"
        :key="category.id"
        class="category-tab"
        :class="{ active: selectedCategory === category.id }"
        @click="selectCategory(category.id as any)"
      >
        <span class="category-icon">{{ category.icon }}</span>
        <span class="category-label">{{ category.label }}</span>
        <span v-if="category.id !== 'overview'" class="category-count">
          {{
            category.id === 'focusable' ? analysis.focusableElements.length :
            category.id === 'interactive' ? analysis.interactiveElements.length :
            category.id === 'skip-links' ? analysis.skipLinks.length :
            analysis.tabOrderIssues.length
          }}
        </span>
      </button>
    </div>

    <!-- Overview -->
    <div v-if="isAnalyzed && analysis && selectedCategory === 'overview'" class="overview-content">
      <div class="stats-grid">
        <div class="stat-card" :class="{ 'has-issues': analysis.stats.totalIssues > 0 }">
          <div class="stat-header">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <h3>Total Issues</h3>
          </div>
          <div class="stat-value">{{ analysis.stats.totalIssues }}</div>
          <p class="stat-description">Keyboard accessibility issues</p>
        </div>

        <div class="stat-card clickable" @click="selectCategory('focusable')">
          <div class="stat-header">
            <span class="stat-icon">⌨️</span>
            <h3>Focusable</h3>
          </div>
          <div class="stat-row">
            <span class="stat-label">Found:</span>
            <span class="stat-number">{{ analysis.stats.focusableCount }}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">No Style:</span>
            <span class="stat-number" :class="{ 'has-issues': analysis.stats.focusStyleIssues > 0 }">
              {{ analysis.stats.focusStyleIssues }}
            </span>
          </div>
        </div>

        <div class="stat-card clickable" @click="selectCategory('interactive')">
          <div class="stat-header">
            <span class="stat-icon">🖱️</span>
            <h3>Interactive</h3>
          </div>
          <div class="stat-row">
            <span class="stat-label">Found:</span>
            <span class="stat-number">{{ analysis.interactiveElements.length }}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Issues:</span>
            <span class="stat-number" :class="{ 'has-issues': analysis.stats.interactiveIssues > 0 }">
              {{ analysis.stats.interactiveIssues }}
            </span>
          </div>
        </div>

        <div class="stat-card clickable" @click="selectCategory('skip-links')">
          <div class="stat-header">
            <span class="stat-icon">⏩</span>
            <h3>Skip Links</h3>
          </div>
          <div class="stat-row">
            <span class="stat-label">Found:</span>
            <span class="stat-number">{{ analysis.skipLinks.length }}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Issues:</span>
            <span class="stat-number" :class="{ 'has-issues': analysis.stats.skipLinkIssues > 0 }">
              {{ analysis.stats.skipLinkIssues }}
            </span>
          </div>
        </div>

        <div class="stat-card clickable" @click="selectCategory('tab-order')">
          <div class="stat-header">
            <span class="stat-icon">🔢</span>
            <h3>Tab Order</h3>
          </div>
          <div class="stat-row">
            <span class="stat-label">Issues:</span>
            <span class="stat-number" :class="{ 'has-issues': analysis.stats.tabOrderIssues > 0 }">
              {{ analysis.stats.tabOrderIssues }}
            </span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Info:</span>
            <span class="stat-number">Positive tabindex</span>
          </div>
        </div>
      </div>

      <div v-if="analysis.stats.totalIssues === 0" class="success-panel">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
          <path d="M8 12l3 3 5-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <h3>Excellent!</h3>
        <p>No keyboard navigation issues detected on this page.</p>
      </div>

      <div class="info-panel">
        <div class="info-header">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
            <path d="M12 16v-4M12 8h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <span>Keyboard Navigation Tips</span>
        </div>
        <ul>
          <li>Use <strong>Tab</strong> to navigate forward through focusable elements</li>
          <li>Use <strong>Shift + Tab</strong> to navigate backward</li>
          <li>All interactive elements should be keyboard accessible</li>
          <li>Focus styles should be clearly visible</li>
          <li>Avoid positive tabindex values (use DOM order instead)</li>
        </ul>
      </div>
    </div>

    <!-- Focusable Elements -->
    <div v-else-if="isAnalyzed && analysis && selectedCategory === 'focusable'" class="detail-content">
      <div class="detail-header">
        <h3>Focusable Elements ({{ analysis.focusableElements.length }})</h3>
        <span v-if="analysis.stats.focusStyleIssues > 0" class="issue-badge">
          {{ analysis.stats.focusStyleIssues }} issues
        </span>
      </div>

      <div v-if="analysis.focusableElements.length === 0" class="empty-message">
        No focusable elements found on this page.
      </div>

      <div v-else class="item-list">
        <div
          v-for="(item, index) in analysis.focusableElements"
          :key="index"
          class="item-card"
          :class="{ 'has-issue': item.hasIssue }"
          @click="handleElementClick(item.element)"
        >
          <div class="item-header">
            <span class="item-type">{{ item.tagName }}</span>
            <div class="item-badges">
              <span v-if="item.tabIndex !== 0" class="tabindex-badge">
                tabindex: {{ item.tabIndex }}
              </span>
              <span v-if="item.hasIssue" class="issue-tag" :class="getSeverityClass(item.issueType)">
                {{ getIssueLabel(item.issueType) }}
              </span>
            </div>
          </div>
          <div class="item-content">
            <p class="item-text">{{ item.text }}</p>
            <div v-if="item.hasFocusStyle" class="focus-indicator">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span>Has focus style</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Interactive Elements -->
    <div v-else-if="isAnalyzed && analysis && selectedCategory === 'interactive'" class="detail-content">
      <div class="detail-header">
        <h3>Interactive Elements ({{ analysis.interactiveElements.length }})</h3>
        <span v-if="analysis.stats.interactiveIssues > 0" class="issue-badge">
          {{ analysis.stats.interactiveIssues }} issues
        </span>
      </div>

      <div v-if="analysis.interactiveElements.length === 0" class="empty-message">
        No interactive elements with issues found.
      </div>

      <div v-else class="item-list">
        <div
          v-for="(item, index) in analysis.interactiveElements"
          :key="index"
          class="item-card"
          :class="{ 'has-issue': item.hasIssue }"
          @click="handleElementClick(item.element)"
        >
          <div class="item-header">
            <span class="item-type">{{ item.tagName }}</span>
            <span v-if="item.hasIssue" class="issue-tag" :class="getSeverityClass(item.issueType)">
              {{ getIssueLabel(item.issueType) }}
            </span>
          </div>
          <div class="item-content">
            <p class="item-text">{{ item.text }}</p>
            <p class="item-hint">Add tabindex="0" or use a semantic element</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Skip Links -->
    <div v-else-if="isAnalyzed && analysis && selectedCategory === 'skip-links'" class="detail-content">
      <div class="detail-header">
        <h3>Skip Links ({{ analysis.skipLinks.length }})</h3>
        <span v-if="analysis.stats.skipLinkIssues > 0" class="issue-badge">
          {{ analysis.stats.skipLinkIssues }} issues
        </span>
      </div>

      <div v-if="analysis.skipLinks.length === 0" class="empty-message">
        No skip links found on this page.
        <p class="hint-text">Consider adding a "Skip to main content" link for better accessibility.</p>
      </div>

      <div v-else class="item-list">
        <div
          v-for="(item, index) in analysis.skipLinks"
          :key="index"
          class="item-card"
          :class="{ 'has-issue': item.hasIssue }"
          @click="handleElementClick(item.element)"
        >
          <div class="item-header">
            <span class="item-icon">⏩</span>
            <span v-if="item.hasIssue" class="issue-tag" :class="getSeverityClass(item.issueType)">
              {{ getIssueLabel(item.issueType) }}
            </span>
          </div>
          <div class="item-content">
            <p class="item-text">{{ item.text }}</p>
            <p class="item-meta">Target: {{ item.href }}</p>
            <div v-if="!item.isVisible" class="visibility-indicator">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 2L22 22" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <path d="M9 9a3 3 0 104.5 2.5" stroke="currentColor" stroke-width="2"/>
              </svg>
              <span>Hidden (should appear on focus)</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab Order Issues -->
    <div v-else-if="isAnalyzed && analysis && selectedCategory === 'tab-order'" class="detail-content">
      <div class="detail-header">
        <h3>Tab Order Issues ({{ analysis.tabOrderIssues.length }})</h3>
      </div>

      <div v-if="analysis.tabOrderIssues.length === 0" class="empty-message">
        No tab order issues found. Great!
        <p class="hint-text">Using natural DOM order is best practice.</p>
      </div>

      <div v-else class="item-list">
        <div
          v-for="(item, index) in analysis.tabOrderIssues"
          :key="index"
          class="item-card has-issue"
          @click="handleElementClick(item.element)"
        >
          <div class="item-header">
            <span class="item-type">{{ item.tagName }}</span>
            <span class="tabindex-badge warning">
              tabindex: {{ item.tabIndex }}
            </span>
            <span class="issue-tag warning">
              {{ getIssueLabel(item.issueType) }}
            </span>
          </div>
          <div class="item-content">
            <p class="item-text">{{ item.text }}</p>
            <p class="item-hint">Avoid positive tabindex. Use DOM order instead.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.keyboard-nav-tab {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Controls */
.controls {
  display: flex;
  gap: 12px;
}

.refresh-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex: 1;
  padding: 14px 20px;
  background: var(--gradient-point);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 14px rgba(102, 126, 234, 0.4);
}

.refresh-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
}

.tab-order-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 20px;
  background: var(--card-bg-color);
  color: var(--font-color-1);
  border: 2px solid var(--border-color);
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.tab-order-button:hover {
  background: var(--card-bg-hover);
  border-color: var(--purple);
}

.tab-order-button.active {
  background: var(--purple);
  color: white;
  border-color: var(--purple);
  box-shadow: 0 4px 14px rgba(102, 126, 234, 0.4);
}

/* Category Tabs */
.category-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.category-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: var(--card-bg-color);
  border: 2px solid transparent;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--font-color-2);
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.category-tab:hover {
  background: var(--card-bg-hover);
}

.category-tab.active {
  background: var(--card-bg-hover);
  border-color: var(--purple);
  color: var(--font-color-1);
}

.category-icon {
  font-size: 14px;
}

.category-label {
  font-size: 11px;
}

.category-count {
  padding: 2px 6px;
  background: rgba(102, 126, 234, 0.15);
  border-radius: 10px;
  font-size: 10px;
  font-weight: 700;
  color: var(--purple);
}

/* Overview */
.overview-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.stat-card {
  padding: 14px;
  background: var(--card-bg-color);
  border: 2px solid transparent;
  border-radius: 10px;
  transition: all 0.2s ease;
}

.stat-card.clickable {
  cursor: pointer;
}

.stat-card.clickable:hover {
  background: var(--card-bg-hover);
  transform: translateY(-2px);
  border-color: var(--purple);
}

.stat-card.has-issues {
  border-left: 3px solid #ef4444;
}

.stat-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.stat-header svg {
  color: var(--purple);
}

.stat-icon {
  font-size: 18px;
}

.stat-header h3 {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--font-color-1);
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: var(--purple);
  margin-bottom: 4px;
}

.stat-description {
  margin: 0;
  font-size: 11px;
  color: var(--font-color-2);
}

.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
  font-size: 11px;
}

.stat-label {
  color: var(--font-color-2);
}

.stat-number {
  font-weight: 600;
  color: var(--font-color-1);
}

.stat-number.has-issues {
  color: #ef4444;
}

/* Success Panel */
.success-panel {
  padding: 24px;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%);
  border-radius: 10px;
  border: 1px solid rgba(16, 185, 129, 0.2);
  text-align: center;
}

.success-panel svg {
  color: #10b981;
  margin-bottom: 12px;
}

.success-panel h3 {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--font-color-1);
}

.success-panel p {
  margin: 0;
  font-size: 13px;
  color: var(--font-color-2);
}

/* Info Panel */
.info-panel {
  padding: 16px;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
  border-radius: 10px;
  border: 1px solid rgba(102, 126, 234, 0.2);
}

.info-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-weight: 600;
  font-size: 13px;
  color: var(--purple);
}

.info-panel ul {
  margin: 0;
  padding-left: 20px;
  font-size: 12px;
  line-height: 1.8;
  color: var(--font-color-1);
}

.info-panel li {
  margin-bottom: 4px;
}

/* Detail Content */
.detail-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color);
}

.detail-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--font-color-1);
}

.issue-badge {
  padding: 4px 10px;
  background: rgba(239, 68, 68, 0.1);
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  color: #ef4444;
}

.empty-message {
  padding: 32px;
  text-align: center;
  font-size: 13px;
  color: var(--font-color-2);
}

.hint-text {
  margin-top: 8px;
  font-size: 12px;
  color: var(--font-color-2);
  font-style: italic;
}

/* Item List */
.item-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.item-card {
  padding: 12px;
  background: var(--card-bg-color);
  border: 2px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.item-card:hover {
  background: var(--card-bg-hover);
  transform: translateX(4px);
}

.item-card.has-issue {
  border-left: 3px solid #ef4444;
}

.item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  gap: 8px;
  flex-wrap: wrap;
}

.item-badges {
  display: flex;
  align-items: center;
  gap: 6px;
}

.item-icon {
  font-size: 16px;
}

.item-type {
  padding: 4px 8px;
  background: rgba(102, 126, 234, 0.15);
  border-radius: 6px;
  font-size: 10px;
  font-weight: 600;
  color: var(--purple);
  text-transform: uppercase;
}

.tabindex-badge {
  padding: 3px 8px;
  background: rgba(59, 130, 246, 0.15);
  border-radius: 6px;
  font-size: 10px;
  font-weight: 600;
  color: #3b82f6;
}

.tabindex-badge.warning {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
}

.issue-tag {
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 600;
}

.issue-tag.critical {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.issue-tag.warning {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
}

.issue-tag.info {
  background: rgba(59, 130, 246, 0.15);
  color: #3b82f6;
}

.item-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.item-text {
  margin: 0;
  font-size: 12px;
  font-weight: 500;
  color: var(--font-color-1);
  line-height: 1.4;
}

.item-meta {
  margin: 0;
  font-size: 10px;
  color: var(--font-color-2);
  font-family: 'Courier New', monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-hint {
  margin: 0;
  font-size: 11px;
  color: var(--font-color-2);
  font-style: italic;
}

.focus-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: rgba(16, 185, 129, 0.1);
  border-radius: 6px;
  font-size: 11px;
  color: #10b981;
  width: fit-content;
}

.focus-indicator svg {
  flex-shrink: 0;
}

.visibility-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: rgba(245, 158, 11, 0.1);
  border-radius: 6px;
  font-size: 11px;
  color: #f59e0b;
  width: fit-content;
}

.visibility-indicator svg {
  flex-shrink: 0;
}
</style>
