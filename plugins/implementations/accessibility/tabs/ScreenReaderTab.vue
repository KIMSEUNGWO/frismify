<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  analyzeScreenReaderAccessibility,
  highlightElement,
  removeHighlights,
  type ScreenReaderAnalysis,
  type HeadingInfo,
  type ImageInfo,
  type FormInfo,
  type LinkInfo,
  type AriaInfo,
  type LandmarkInfo,
} from '../screenReaderUtils';

const isAnalyzed = ref(false);
const analysis = ref<ScreenReaderAnalysis | null>(null);
const selectedCategory = ref<'overview' | 'headings' | 'images' | 'forms' | 'links' | 'aria' | 'landmarks'>('overview');

const categories = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'headings', label: 'Headings', icon: 'H' },
  { id: 'images', label: 'Images', icon: '🖼️' },
  { id: 'forms', label: 'Forms', icon: '📝' },
  { id: 'links', label: 'Links', icon: '🔗' },
  { id: 'aria', label: 'ARIA', icon: '♿' },
  { id: 'landmarks', label: 'Landmarks', icon: '🗺️' },
] as const;

const startAnalysis = () => {
  console.log('[Accessibility] Starting screen reader analysis...');
  analysis.value = analyzeScreenReaderAccessibility();
  isAnalyzed.value = true;
  console.log('[Accessibility] Analysis complete:', analysis.value);
};

const refreshAnalysis = () => {
  console.log('[Accessibility] Refreshing screen reader analysis...');
  selectedCategory.value = 'overview';
  removeHighlights();
  analysis.value = analyzeScreenReaderAccessibility();
  console.log('[Accessibility] Analysis refreshed:', analysis.value);
};

const stopAnalysis = () => {
  isAnalyzed.value = false;
  selectedCategory.value = 'overview';
  removeHighlights();
  analysis.value = null;
  console.log('[Accessibility] Analysis stopped');
};

const selectCategory = (category: typeof selectedCategory.value) => {
  selectedCategory.value = category;
  removeHighlights();
};

const handleElementClick = (element: HTMLElement) => {
  highlightElement(element);
};

const getIssueLabel = (issueType: string | undefined): string => {
  if (!issueType) return '';

  const labels: Record<string, string> = {
    'empty': 'Empty heading',
    'skipped-level': 'Skipped level',
    'missing-alt': 'Missing alt',
    'empty-alt': 'Empty alt',
    'generic-alt': 'Generic alt',
    'missing-label': 'Missing label',
    'empty-label': 'Empty label',
    'empty-text': 'Empty text',
    'generic-text': 'Generic text',
    'no-href': 'No href',
    'invalid-role': 'Invalid role',
    'duplicate': 'Needs label',
  };

  return labels[issueType] || issueType;
};

const getSeverityClass = (issueType: string | undefined): string => {
  if (!issueType) return '';

  const critical = ['missing-alt', 'missing-label', 'empty', 'empty-text', 'no-href'];
  const warning = ['empty-alt', 'generic-alt', 'generic-text', 'skipped-level', 'duplicate'];
  const info = ['invalid-role'];

  if (critical.includes(issueType)) return 'critical';
  if (warning.includes(issueType)) return 'warning';
  if (info.includes(issueType)) return 'info';

  return '';
};

// Auto-analyze on mount
onMounted(() => {
  startAnalysis();
});
</script>

<template>
  <div class="screen-reader-tab">
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
            category.id === 'headings' ? analysis.headings.length :
            category.id === 'images' ? analysis.images.length :
            category.id === 'forms' ? analysis.forms.length :
            category.id === 'links' ? analysis.links.length :
            category.id === 'aria' ? analysis.aria.length :
            analysis.landmarks.length
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
          <p class="stat-description">Accessibility issues found</p>
        </div>

        <div class="stat-card clickable" @click="selectCategory('headings')">
          <div class="stat-header">
            <span class="stat-icon">H</span>
            <h3>Headings</h3>
          </div>
          <div class="stat-row">
            <span class="stat-label">Found:</span>
            <span class="stat-number">{{ analysis.headings.length }}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Issues:</span>
            <span class="stat-number" :class="{ 'has-issues': analysis.stats.headingIssues > 0 }">
              {{ analysis.stats.headingIssues }}
            </span>
          </div>
        </div>

        <div class="stat-card clickable" @click="selectCategory('images')">
          <div class="stat-header">
            <span class="stat-icon">🖼️</span>
            <h3>Images</h3>
          </div>
          <div class="stat-row">
            <span class="stat-label">Found:</span>
            <span class="stat-number">{{ analysis.images.length }}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Issues:</span>
            <span class="stat-number" :class="{ 'has-issues': analysis.stats.imageIssues > 0 }">
              {{ analysis.stats.imageIssues }}
            </span>
          </div>
        </div>

        <div class="stat-card clickable" @click="selectCategory('forms')">
          <div class="stat-header">
            <span class="stat-icon">📝</span>
            <h3>Form Inputs</h3>
          </div>
          <div class="stat-row">
            <span class="stat-label">Found:</span>
            <span class="stat-number">{{ analysis.forms.length }}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Issues:</span>
            <span class="stat-number" :class="{ 'has-issues': analysis.stats.formIssues > 0 }">
              {{ analysis.stats.formIssues }}
            </span>
          </div>
        </div>

        <div class="stat-card clickable" @click="selectCategory('links')">
          <div class="stat-header">
            <span class="stat-icon">🔗</span>
            <h3>Links</h3>
          </div>
          <div class="stat-row">
            <span class="stat-label">Found:</span>
            <span class="stat-number">{{ analysis.links.length }}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Issues:</span>
            <span class="stat-number" :class="{ 'has-issues': analysis.stats.linkIssues > 0 }">
              {{ analysis.stats.linkIssues }}
            </span>
          </div>
        </div>

        <div class="stat-card clickable" @click="selectCategory('aria')">
          <div class="stat-header">
            <span class="stat-icon">♿</span>
            <h3>ARIA</h3>
          </div>
          <div class="stat-row">
            <span class="stat-label">Found:</span>
            <span class="stat-number">{{ analysis.aria.length }}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Issues:</span>
            <span class="stat-number" :class="{ 'has-issues': analysis.stats.ariaIssues > 0 }">
              {{ analysis.stats.ariaIssues }}
            </span>
          </div>
        </div>

        <div class="stat-card clickable" @click="selectCategory('landmarks')">
          <div class="stat-header">
            <span class="stat-icon">🗺️</span>
            <h3>Landmarks</h3>
          </div>
          <div class="stat-row">
            <span class="stat-label">Found:</span>
            <span class="stat-number">{{ analysis.landmarks.length }}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Issues:</span>
            <span class="stat-number" :class="{ 'has-issues': analysis.stats.landmarkIssues > 0 }">
              {{ analysis.stats.landmarkIssues }}
            </span>
          </div>
        </div>
      </div>

      <div v-if="analysis.stats.totalIssues === 0" class="success-panel">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
          <path d="M8 12l3 3 5-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <h3>Great job!</h3>
        <p>No accessibility issues detected on this page.</p>
      </div>
    </div>

    <!-- Headings -->
    <div v-else-if="isAnalyzed && analysis && selectedCategory === 'headings'" class="detail-content">
      <div class="detail-header">
        <h3>Heading Structure ({{ analysis.headings.length }})</h3>
        <span v-if="analysis.stats.headingIssues > 0" class="issue-badge">
          {{ analysis.stats.headingIssues }} issues
        </span>
      </div>

      <div v-if="analysis.headings.length === 0" class="empty-message">
        No headings found on this page.
      </div>

      <div v-else class="item-list">
        <div
          v-for="(heading, index) in analysis.headings"
          :key="index"
          class="item-card"
          :class="{ 'has-issue': heading.hasIssue }"
          @click="handleElementClick(heading.element)"
        >
          <div class="item-header">
            <span class="heading-level">H{{ heading.level }}</span>
            <span v-if="heading.hasIssue" class="issue-tag" :class="getSeverityClass(heading.issueType)">
              {{ getIssueLabel(heading.issueType) }}
            </span>
          </div>
          <div class="item-content">
            <p class="item-text">{{ heading.text }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Images -->
    <div v-else-if="isAnalyzed && analysis && selectedCategory === 'images'" class="detail-content">
      <div class="detail-header">
        <h3>Images ({{ analysis.images.length }})</h3>
        <span v-if="analysis.stats.imageIssues > 0" class="issue-badge">
          {{ analysis.stats.imageIssues }} issues
        </span>
      </div>

      <div v-if="analysis.images.length === 0" class="empty-message">
        No images found on this page.
      </div>

      <div v-else class="item-list">
        <div
          v-for="(image, index) in analysis.images"
          :key="index"
          class="item-card"
          :class="{ 'has-issue': image.hasIssue }"
          @click="handleElementClick(image.element)"
        >
          <div class="item-header">
            <span class="item-icon">🖼️</span>
            <span v-if="image.hasIssue" class="issue-tag" :class="getSeverityClass(image.issueType)">
              {{ getIssueLabel(image.issueType) }}
            </span>
          </div>
          <div class="item-content">
            <p class="item-label">Alt text:</p>
            <p class="item-text">{{ image.alt }}</p>
            <p class="item-meta">{{ image.src }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Forms -->
    <div v-else-if="isAnalyzed && analysis && selectedCategory === 'forms'" class="detail-content">
      <div class="detail-header">
        <h3>Form Inputs ({{ analysis.forms.length }})</h3>
        <span v-if="analysis.stats.formIssues > 0" class="issue-badge">
          {{ analysis.stats.formIssues }} issues
        </span>
      </div>

      <div v-if="analysis.forms.length === 0" class="empty-message">
        No form inputs found on this page.
      </div>

      <div v-else class="item-list">
        <div
          v-for="(form, index) in analysis.forms"
          :key="index"
          class="item-card"
          :class="{ 'has-issue': form.hasIssue }"
          @click="handleElementClick(form.element)"
        >
          <div class="item-header">
            <span class="item-type">{{ form.type }}</span>
            <span v-if="form.hasIssue" class="issue-tag" :class="getSeverityClass(form.issueType)">
              {{ getIssueLabel(form.issueType) }}
            </span>
          </div>
          <div class="item-content">
            <p class="item-label">Label:</p>
            <p class="item-text">{{ form.label }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Links -->
    <div v-else-if="isAnalyzed && analysis && selectedCategory === 'links'" class="detail-content">
      <div class="detail-header">
        <h3>Links ({{ analysis.links.length }})</h3>
        <span v-if="analysis.stats.linkIssues > 0" class="issue-badge">
          {{ analysis.stats.linkIssues }} issues
        </span>
      </div>

      <div v-if="analysis.links.length === 0" class="empty-message">
        No links found on this page.
      </div>

      <div v-else class="item-list">
        <div
          v-for="(link, index) in analysis.links"
          :key="index"
          class="item-card"
          :class="{ 'has-issue': link.hasIssue }"
          @click="handleElementClick(link.element)"
        >
          <div class="item-header">
            <span class="item-icon">🔗</span>
            <span v-if="link.hasIssue" class="issue-tag" :class="getSeverityClass(link.issueType)">
              {{ getIssueLabel(link.issueType) }}
            </span>
          </div>
          <div class="item-content">
            <p class="item-text">{{ link.text }}</p>
            <p class="item-meta">{{ link.href }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- ARIA -->
    <div v-else-if="isAnalyzed && analysis && selectedCategory === 'aria'" class="detail-content">
      <div class="detail-header">
        <h3>ARIA Attributes ({{ analysis.aria.length }})</h3>
        <span v-if="analysis.stats.ariaIssues > 0" class="issue-badge">
          {{ analysis.stats.ariaIssues }} issues
        </span>
      </div>

      <div v-if="analysis.aria.length === 0" class="empty-message">
        No ARIA attributes found on this page.
      </div>

      <div v-else class="item-list">
        <div
          v-for="(aria, index) in analysis.aria"
          :key="index"
          class="item-card"
          :class="{ 'has-issue': aria.hasIssue }"
          @click="handleElementClick(aria.element)"
        >
          <div class="item-header">
            <span class="item-type">{{ aria.role }}</span>
            <span v-if="aria.hasIssue" class="issue-tag" :class="getSeverityClass(aria.issueType)">
              {{ getIssueLabel(aria.issueType) }}
            </span>
          </div>
          <div class="item-content">
            <p class="item-text">{{ aria.label }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Landmarks -->
    <div v-else-if="isAnalyzed && analysis && selectedCategory === 'landmarks'" class="detail-content">
      <div class="detail-header">
        <h3>Page Landmarks ({{ analysis.landmarks.length }})</h3>
        <span v-if="analysis.stats.landmarkIssues > 0" class="issue-badge">
          {{ analysis.stats.landmarkIssues }} issues
        </span>
      </div>

      <div v-if="analysis.landmarks.length === 0" class="empty-message">
        No landmarks found on this page.
      </div>

      <div v-else class="item-list">
        <div
          v-for="(landmark, index) in analysis.landmarks"
          :key="index"
          class="item-card"
          :class="{ 'has-issue': landmark.hasIssue }"
          @click="handleElementClick(landmark.element)"
        >
          <div class="item-header">
            <span class="item-type">{{ landmark.type }}</span>
            <span v-if="landmark.hasIssue" class="issue-tag" :class="getSeverityClass(landmark.issueType)">
              {{ getIssueLabel(landmark.issueType) }}
            </span>
          </div>
          <div v-if="landmark.label" class="item-content">
            <p class="item-label">Label:</p>
            <p class="item-text">{{ landmark.label }}</p>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.screen-reader-tab {
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
  width: 100%;
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
}

.heading-level {
  padding: 4px 8px;
  background: var(--purple);
  color: white;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
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
  gap: 4px;
}

.item-label {
  margin: 0;
  font-size: 10px;
  font-weight: 600;
  color: var(--font-color-2);
  text-transform: uppercase;
  letter-spacing: 0.5px;
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
</style>
