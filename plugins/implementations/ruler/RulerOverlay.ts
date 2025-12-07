/**
 * RulerOverlay
 *
 * Core implementation of the ruler measurement and inspection tool.
 * Handles two modes:
 * - Measure: Drag to measure distances between points
 * - Inspect: Hover to inspect element box models
 */

import { pluginManagerProxy } from '@/core';

// ============================================================================
// Types
// ============================================================================

interface Point {
  x: number;
  y: number;
}

interface Measurement {
  id: string;
  start: Point;
  end: Point;
  horizontal: number;
  vertical: number;
  diagonal: number;
}

interface BoxModel {
  content: DOMRect;
  padding: { top: number; right: number; bottom: number; left: number };
  border: { top: number; right: number; bottom: number; left: number };
  margin: { top: number; right: number; bottom: number; left: number };
}

type RulerMode = 'measure' | 'inspect';
type Unit = 'px' | 'rem';

// ============================================================================
// RulerOverlay Class
// ============================================================================

export class RulerOverlay {
  // === Plugin Configuration ===
  private readonly pluginId: string;
  private readonly baseFontSize = 16; // Default browser font size for rem conversion

  // === DOM Elements ===
  private svg: SVGSVGElement | null = null;
  private measurementGroup: SVGGElement | null = null;
  private hoverOverlay: HTMLDivElement | null = null;
  private tooltip: HTMLDivElement | null = null;

  // === State ===
  private mode: RulerMode = 'measure';
  private snapEnabled = true;
  private unit: Unit = 'px';
  private lineColor = '#3B82F6';

  // === Measurement State ===
  private isDragging = false;
  private startPoint: Point | null = null;
  private currentPoint: Point | null = null;
  private measurements: Measurement[] = [];
  private measurementCounter = 0;

  // === Event Handlers (bound methods) ===
  private readonly handleMouseDown: (e: MouseEvent) => void;
  private readonly handleMouseMove: (e: MouseEvent) => void;
  private readonly handleMouseUp: (e: MouseEvent) => void;
  private readonly handleKeyDown: (e: KeyboardEvent) => void;

  constructor(pluginId: string) {
    this.pluginId = pluginId;

    // Bind event handlers to maintain 'this' context
    this.handleMouseDown = this.onMouseDown.bind(this);
    this.handleMouseMove = this.onMouseMove.bind(this);
    this.handleMouseUp = this.onMouseUp.bind(this);
    this.handleKeyDown = this.onKeyDown.bind(this);
  }

  // ==========================================================================
  // Initialization & Cleanup
  // ==========================================================================

  async init(): Promise<void> {
    await this.loadSettings();
    this.createOverlays();
    this.attachEventListeners();
    this.showWelcomeMessage();
  }

  destroy(): void {
    this.detachEventListeners();
    this.removeOverlays();
    this.clearState();
  }

  // ==========================================================================
  // Settings
  // ==========================================================================

  private async loadSettings(): Promise<void> {
    const settings = await pluginManagerProxy.getPluginSettings(this.pluginId);

    this.mode = settings.defaultMode ?? 'measure';
    this.snapEnabled = settings.snapToElements ?? true;
    this.unit = settings.unit ?? 'px';
    this.lineColor = settings.lineColor ?? '#3B82F6';
  }

  // ==========================================================================
  // DOM Creation
  // ==========================================================================

  private createOverlays(): void {
    this.createSVGOverlay();
    this.createHoverOverlay();
    this.createTooltip();
  }

  private createSVGOverlay(): void {
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.id = 'prismify-ruler-svg';
    this.svg.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 2147483646;
      pointer-events: none;
    `;

    this.measurementGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.measurementGroup.id = 'prismify-ruler-measurements';
    this.svg.appendChild(this.measurementGroup);

    document.body.appendChild(this.svg);
  }

  private createHoverOverlay(): void {
    this.hoverOverlay = document.createElement('div');
    this.hoverOverlay.id = 'prismify-ruler-hover';
    this.hoverOverlay.style.cssText = `
      position: absolute;
      pointer-events: none;
      z-index: 2147483645;
      display: none;
    `;
    document.body.appendChild(this.hoverOverlay);
  }

  private createTooltip(): void {
    this.tooltip = document.createElement('div');
    this.tooltip.id = 'prismify-ruler-tooltip';
    this.tooltip.style.cssText = `
      position: fixed;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
      font-size: 12px;
      z-index: 2147483647;
      pointer-events: none;
      display: none;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      max-width: 400px;
      line-height: 1.6;
    `;
    document.body.appendChild(this.tooltip);
  }

  private removeOverlays(): void {
    this.svg?.remove();
    this.hoverOverlay?.remove();
    this.tooltip?.remove();
    document.getElementById('prismify-ruler-instructions')?.remove();
  }

  // ==========================================================================
  // Event Listeners
  // ==========================================================================

  private attachEventListeners(): void {
    document.addEventListener('mousedown', this.handleMouseDown, true);
    document.addEventListener('mousemove', this.handleMouseMove, true);
    document.addEventListener('mouseup', this.handleMouseUp, true);
    document.addEventListener('keydown', this.handleKeyDown, true);
  }

  private detachEventListeners(): void {
    document.removeEventListener('mousedown', this.handleMouseDown, true);
    document.removeEventListener('mousemove', this.handleMouseMove, true);
    document.removeEventListener('mouseup', this.handleMouseUp, true);
    document.removeEventListener('keydown', this.handleKeyDown, true);
  }

  // ==========================================================================
  // Event Handlers
  // ==========================================================================

  private onMouseDown(e: MouseEvent): void {
    // Ignore clicks on our own UI
    if (this.isOwnElement(e.target)) return;

    if (this.mode === 'measure') {
      const point = this.getPoint(e);
      this.startPoint = this.snapEnabled ? this.snapToElement(point, e) : point;
      this.isDragging = true;
      this.hideTooltip();
    }
  }

  private onMouseMove(e: MouseEvent): void {
    if (this.mode === 'measure' && this.isDragging && this.startPoint) {
      const point = this.getPoint(e);
      this.currentPoint = this.snapEnabled ? this.snapToElement(point, e) : point;
      this.drawTemporaryMeasurement();
    } else if (this.mode === 'inspect') {
      this.inspectElement(e);
    }
  }

  private onMouseUp(e: MouseEvent): void {
    if (this.mode === 'measure' && this.isDragging && this.startPoint && this.currentPoint) {
      // Clear previous measurements unless Shift is held
      if (!e.shiftKey) {
        this.clearMeasurements();
      }

      this.saveMeasurement();
      this.resetDragState();
    }
  }

  private onKeyDown(e: KeyboardEvent): void {
    switch (e.key.toLowerCase()) {
      case 'escape':
        this.clearMeasurements();
        this.resetDragState();
        break;

      case 'c':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          this.copyLastMeasurement();
        } else {
          this.clearMeasurements();
        }
        break;

      case 'e':
        this.toggleMode();
        break;

      case 's':
        this.toggleSnap();
        break;

      case 'u':
        this.toggleUnit();
        break;
    }
  }

  // ==========================================================================
  // Measurement Mode
  // ==========================================================================

  private drawTemporaryMeasurement(): void {
    if (!this.svg || !this.startPoint || !this.currentPoint) return;

    // Remove existing temporary measurement
    this.svg.querySelector('#temp-measurement')?.remove();

    // Draw new temporary measurement
    const group = this.createMeasurementGraphic(
      this.startPoint,
      this.currentPoint,
      'temp-measurement',
      true
    );
    this.svg.appendChild(group);
  }

  private saveMeasurement(): void {
    if (!this.measurementGroup || !this.startPoint || !this.currentPoint) return;

    const measurement: Measurement = {
      id: `measurement-${this.measurementCounter++}`,
      start: { ...this.startPoint },
      end: { ...this.currentPoint },
      horizontal: Math.abs(this.currentPoint.x - this.startPoint.x),
      vertical: Math.abs(this.currentPoint.y - this.startPoint.y),
      diagonal: this.calculateDistance(this.startPoint, this.currentPoint),
    };

    this.measurements.push(measurement);

    // Remove temporary measurement
    this.svg?.querySelector('#temp-measurement')?.remove();

    // Create permanent measurement graphic
    const group = this.createMeasurementGraphic(
      measurement.start,
      measurement.end,
      measurement.id,
      false
    );
    this.measurementGroup.appendChild(group);
  }

  private createMeasurementGraphic(
    start: Point,
    end: Point,
    id: string,
    isTemporary: boolean
  ): SVGGElement {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.id = id;

    const horizontal = Math.abs(end.x - start.x);
    const vertical = Math.abs(end.y - start.y);
    const diagonal = this.calculateDistance(start, end);

    const opacity = isTemporary ? 0.7 : 1;
    const strokeWidth = isTemporary ? 1.5 : 1;

    // Main diagonal line
    group.appendChild(
      this.createLine(start.x, start.y, end.x, end.y, this.lineColor, '2', opacity)
    );

    // Horizontal guide
    if (horizontal > 5) {
      group.appendChild(
        this.createLine(start.x, start.y, end.x, start.y, this.lineColor, strokeWidth.toString(), opacity, '4,4')
      );
      group.appendChild(
        this.createLabel((start.x + end.x) / 2, start.y - 8, this.formatValue(horizontal), this.lineColor)
      );
    }

    // Vertical guide
    if (vertical > 5) {
      group.appendChild(
        this.createLine(end.x, start.y, end.x, end.y, this.lineColor, strokeWidth.toString(), opacity, '4,4')
      );
      group.appendChild(
        this.createLabel(end.x + 8, (start.y + end.y) / 2, this.formatValue(vertical), this.lineColor)
      );
    }

    // Diagonal label (emphasized)
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    const angle = Math.atan2(end.y - start.y, end.x - start.x) * (180 / Math.PI);
    const offset = 15;
    const labelX = midX + offset * Math.sin(angle * Math.PI / 180);
    const labelY = midY - offset * Math.cos(angle * Math.PI / 180);

    group.appendChild(
      this.createLabel(labelX, labelY, this.formatValue(diagonal), this.lineColor, true)
    );

    // Start and end markers
    group.appendChild(this.createMarker(start.x, start.y, this.lineColor));
    group.appendChild(this.createMarker(end.x, end.y, this.lineColor));

    return group;
  }

  private clearMeasurements(): void {
    this.measurements = [];
    if (this.measurementGroup) {
      this.measurementGroup.innerHTML = '';
    }
  }

  private copyLastMeasurement(): void {
    if (this.measurements.length === 0) {
      this.showNotification('No measurements to copy', '#EF4444');
      return;
    }

    const last = this.measurements[this.measurements.length - 1];
    const text = `Width: ${this.formatValue(last.horizontal)}, Height: ${this.formatValue(last.vertical)}, Distance: ${this.formatValue(last.diagonal)}`;

    navigator.clipboard.writeText(text)
      .then(() => this.showNotification('Copied to clipboard!', '#10B981'))
      .catch(() => this.showNotification('Failed to copy', '#EF4444'));
  }

  // ==========================================================================
  // Inspect Mode
  // ==========================================================================

  private inspectElement(e: MouseEvent): void {
    const target = document.elementFromPoint(e.clientX, e.clientY);

    // Ignore our own elements
    if (!target || this.isOwnElement(target)) {
      this.hideHoverOverlay();
      this.hideTooltip();
      return;
    }

    const element = target as HTMLElement;
    this.showBoxModel(element);
    this.showElementInfo(element, e);
  }

  private showBoxModel(element: HTMLElement): void {
    if (!this.hoverOverlay) return;

    const boxModel = this.getBoxModel(element);
    const rect = element.getBoundingClientRect();

    this.hoverOverlay.innerHTML = '';
    this.hoverOverlay.style.display = 'block';

    // Content (blue)
    this.hoverOverlay.appendChild(
      this.createBoxDiv(
        rect.left,
        rect.top,
        rect.width,
        rect.height,
        'rgba(59, 130, 246, 0.3)',
        '2px solid #3B82F6'
      )
    );

    // Padding (light blue)
    const paddingBoxes = this.createPaddingBoxes(rect, boxModel.padding);
    paddingBoxes.forEach(box => this.hoverOverlay!.appendChild(box));

    // Margin (orange)
    const marginBoxes = this.createMarginBoxes(rect, boxModel.padding, boxModel.border, boxModel.margin);
    marginBoxes.forEach(box => this.hoverOverlay!.appendChild(box));
  }

  private createPaddingBoxes(rect: DOMRect, padding: BoxModel['padding']): HTMLDivElement[] {
    const boxes: HTMLDivElement[] = [];
    const color = 'rgba(147, 197, 253, 0.3)';

    // Top
    boxes.push(this.createBoxDiv(
      rect.left - padding.left,
      rect.top - padding.top,
      rect.width + padding.left + padding.right,
      padding.top,
      color
    ));

    // Bottom
    boxes.push(this.createBoxDiv(
      rect.left - padding.left,
      rect.bottom,
      rect.width + padding.left + padding.right,
      padding.bottom,
      color
    ));

    // Left
    boxes.push(this.createBoxDiv(
      rect.left - padding.left,
      rect.top,
      padding.left,
      rect.height,
      color
    ));

    // Right
    boxes.push(this.createBoxDiv(
      rect.right,
      rect.top,
      padding.right,
      rect.height,
      color
    ));

    return boxes;
  }

  private createMarginBoxes(
    rect: DOMRect,
    padding: BoxModel['padding'],
    border: BoxModel['border'],
    margin: BoxModel['margin']
  ): HTMLDivElement[] {
    const boxes: HTMLDivElement[] = [];
    const color = 'rgba(251, 191, 36, 0.2)';

    const totalLeft = padding.left + border.left;
    const totalRight = padding.right + border.right;
    const totalTop = padding.top + border.top;
    const totalBottom = padding.bottom + border.bottom;
    const totalWidth = rect.width + totalLeft + totalRight;

    // Top
    boxes.push(this.createBoxDiv(
      rect.left - totalLeft - margin.left,
      rect.top - totalTop - margin.top,
      totalWidth + margin.left + margin.right,
      margin.top,
      color
    ));

    // Bottom
    boxes.push(this.createBoxDiv(
      rect.left - totalLeft - margin.left,
      rect.bottom + totalBottom,
      totalWidth + margin.left + margin.right,
      margin.bottom,
      color
    ));

    // Left
    boxes.push(this.createBoxDiv(
      rect.left - totalLeft - margin.left,
      rect.top - totalTop,
      margin.left,
      rect.height + totalTop + totalBottom,
      color
    ));

    // Right
    boxes.push(this.createBoxDiv(
      rect.right + totalRight,
      rect.top - totalTop,
      margin.right,
      rect.height + totalTop + totalBottom,
      color
    ));

    return boxes;
  }

  private showElementInfo(element: HTMLElement, e: MouseEvent): void {
    if (!this.tooltip) return;

    const styles = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const boxModel = this.getBoxModel(element);

    const tagName = element.tagName.toLowerCase();
    const className = element.className
      ? `.${element.className.toString().trim().split(/\s+/).join('.')}`
      : '';
    const selector = `${tagName}${className}`;

    this.tooltip.innerHTML = `
      <div style="color: #60a5fa; font-weight: bold; margin-bottom: 8px;">
        ${this.escapeHtml(selector)}
      </div>
      <div style="display: grid; grid-template-columns: auto 1fr; gap: 8px 12px; font-size: 11px;">
        <span style="color: #9ca3af;">Size:</span>
        <span>${Math.round(rect.width)} × ${Math.round(rect.height)}px</span>

        <span style="color: #9ca3af;">Margin:</span>
        <span style="color: #fbbf24;">${Math.round(boxModel.margin.top)} ${Math.round(boxModel.margin.right)} ${Math.round(boxModel.margin.bottom)} ${Math.round(boxModel.margin.left)}</span>

        <span style="color: #9ca3af;">Padding:</span>
        <span style="color: #93c5fd;">${Math.round(boxModel.padding.top)} ${Math.round(boxModel.padding.right)} ${Math.round(boxModel.padding.bottom)} ${Math.round(boxModel.padding.left)}</span>

        <span style="color: #9ca3af;">Position:</span>
        <span>x: ${Math.round(rect.left)}, y: ${Math.round(rect.top)}</span>

        <span style="color: #9ca3af;">Display:</span>
        <span>${styles.display}</span>

        <span style="color: #9ca3af;">Font:</span>
        <span>${styles.fontSize} / ${styles.lineHeight}</span>
      </div>
      <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #374151; font-size: 10px; color: #6b7280;">
        Mode: <span style="color: #10b981;">INSPECT</span> • Press E to switch
      </div>
    `;

    this.tooltip.style.display = 'block';
    this.positionTooltip(e);
  }

  private positionTooltip(e: MouseEvent): void {
    if (!this.tooltip) return;

    const tooltipRect = this.tooltip.getBoundingClientRect();
    let left = e.clientX + 15;
    let top = e.clientY + 15;

    // Keep tooltip within viewport
    if (left + tooltipRect.width > window.innerWidth) {
      left = e.clientX - tooltipRect.width - 15;
    }
    if (top + tooltipRect.height > window.innerHeight) {
      top = e.clientY - tooltipRect.height - 15;
    }

    this.tooltip.style.left = `${left}px`;
    this.tooltip.style.top = `${top}px`;
  }

  private getBoxModel(element: HTMLElement): BoxModel {
    const styles = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();

    return {
      content: rect,
      padding: {
        top: parseFloat(styles.paddingTop),
        right: parseFloat(styles.paddingRight),
        bottom: parseFloat(styles.paddingBottom),
        left: parseFloat(styles.paddingLeft),
      },
      border: {
        top: parseFloat(styles.borderTopWidth),
        right: parseFloat(styles.borderRightWidth),
        bottom: parseFloat(styles.borderBottomWidth),
        left: parseFloat(styles.borderLeftWidth),
      },
      margin: {
        top: parseFloat(styles.marginTop),
        right: parseFloat(styles.marginRight),
        bottom: parseFloat(styles.marginBottom),
        left: parseFloat(styles.marginLeft),
      },
    };
  }

  // ==========================================================================
  // Mode & Setting Toggles
  // ==========================================================================

  private toggleMode(): void {
    this.mode = this.mode === 'measure' ? 'inspect' : 'measure';
    this.hideHoverOverlay();
    this.hideTooltip();
    this.showNotification(
      `Mode: ${this.mode.toUpperCase()}`,
      this.mode === 'measure' ? '#3B82F6' : '#10B981'
    );
  }

  private toggleSnap(): void {
    this.snapEnabled = !this.snapEnabled;
    this.showNotification(`Snap: ${this.snapEnabled ? 'ON' : 'OFF'}`, '#3B82F6');
  }

  private toggleUnit(): void {
    this.unit = this.unit === 'px' ? 'rem' : 'px';
    this.showNotification(`Unit: ${this.unit}`, '#3B82F6');

    // Redraw all measurements with new unit
    this.redrawMeasurements();
  }

  private redrawMeasurements(): void {
    if (!this.measurementGroup) return;

    const savedMeasurements = [...this.measurements];
    this.measurementGroup.innerHTML = '';

    savedMeasurements.forEach(m => {
      const group = this.createMeasurementGraphic(m.start, m.end, m.id, false);
      this.measurementGroup!.appendChild(group);
    });
  }

  // ==========================================================================
  // Utility: Snapping
  // ==========================================================================

  private snapToElement(point: Point, e: MouseEvent): Point {
    const target = document.elementFromPoint(point.x, point.y);
    if (!target || this.isOwnElement(target)) return point;

    const rect = target.getBoundingClientRect();
    const snapThreshold = 10;

    const edges = [
      { pos: rect.left, axis: 'x' as const },
      { pos: rect.right, axis: 'x' as const },
      { pos: rect.left + rect.width / 2, axis: 'x' as const },
      { pos: rect.top, axis: 'y' as const },
      { pos: rect.bottom, axis: 'y' as const },
      { pos: rect.top + rect.height / 2, axis: 'y' as const },
    ];

    let snappedX = point.x;
    let snappedY = point.y;

    for (const edge of edges) {
      if (edge.axis === 'x' && Math.abs(point.x - edge.pos) < snapThreshold) {
        snappedX = edge.pos;
      }
      if (edge.axis === 'y' && Math.abs(point.y - edge.pos) < snapThreshold) {
        snappedY = edge.pos;
      }
    }

    return { x: snappedX, y: snappedY };
  }

  // ==========================================================================
  // Utility: SVG Primitives
  // ==========================================================================

  private createLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string,
    width: string,
    opacity: number,
    dasharray?: string
  ): SVGLineElement {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1.toString());
    line.setAttribute('y1', y1.toString());
    line.setAttribute('x2', x2.toString());
    line.setAttribute('y2', y2.toString());
    line.setAttribute('stroke', color);
    line.setAttribute('stroke-width', width);
    line.setAttribute('opacity', opacity.toString());
    if (dasharray) {
      line.setAttribute('stroke-dasharray', dasharray);
    }
    return line;
  }

  private createLabel(
    x: number,
    y: number,
    text: string,
    color: string,
    bold = false
  ): SVGGElement {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');

    // Background rect
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('fill', color);
    bg.setAttribute('rx', '4');
    bg.style.pointerEvents = 'none';

    // Text
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', x.toString());
    label.setAttribute('y', y.toString());
    label.setAttribute('fill', '#fff');
    label.setAttribute('font-size', '12');
    label.setAttribute('font-family', "'Monaco', 'Menlo', 'Consolas', monospace");
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('dominant-baseline', 'middle');
    if (bold) label.setAttribute('font-weight', 'bold');
    label.style.pointerEvents = 'none';
    label.textContent = text;

    // Append to group (text first to get bbox)
    group.appendChild(label);

    // Position background based on text bbox
    const bbox = label.getBBox();
    bg.setAttribute('x', (bbox.x - 4).toString());
    bg.setAttribute('y', (bbox.y - 2).toString());
    bg.setAttribute('width', (bbox.width + 8).toString());
    bg.setAttribute('height', (bbox.height + 4).toString());

    // Insert bg before text
    group.insertBefore(bg, label);

    return group;
  }

  private createMarker(x: number, y: number, color: string): SVGCircleElement {
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    marker.setAttribute('cx', x.toString());
    marker.setAttribute('cy', y.toString());
    marker.setAttribute('r', '4');
    marker.setAttribute('fill', color);
    marker.setAttribute('stroke', '#fff');
    marker.setAttribute('stroke-width', '2');
    return marker;
  }

  // ==========================================================================
  // Utility: DOM Helpers
  // ==========================================================================

  private createBoxDiv(
    left: number,
    top: number,
    width: number,
    height: number,
    background: string,
    border?: string
  ): HTMLDivElement {
    const div = document.createElement('div');
    div.style.cssText = `
      position: absolute;
      left: ${left + window.scrollX}px;
      top: ${top + window.scrollY}px;
      width: ${width}px;
      height: ${height}px;
      background: ${background};
      ${border ? `border: ${border};` : ''}
      pointer-events: none;
    `;
    return div;
  }

  // ==========================================================================
  // Utility: Formatting & Math
  // ==========================================================================

  private formatValue(px: number): string {
    if (this.unit === 'rem') {
      const rem = px / this.baseFontSize;
      return `${rem.toFixed(2)}rem`;
    }
    return `${Math.round(px)}px`;
  }

  private calculateDistance(p1: Point, p2: Point): number {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  }

  private getPoint(e: MouseEvent): Point {
    return { x: e.clientX, y: e.clientY };
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ==========================================================================
  // Utility: State Management
  // ==========================================================================

  private resetDragState(): void {
    this.isDragging = false;
    this.startPoint = null;
    this.currentPoint = null;
  }

  private clearState(): void {
    this.resetDragState();
    this.measurements = [];
    this.measurementCounter = 0;
  }

  // ==========================================================================
  // Utility: UI Visibility
  // ==========================================================================

  private hideHoverOverlay(): void {
    if (this.hoverOverlay) {
      this.hoverOverlay.style.display = 'none';
      this.hoverOverlay.innerHTML = '';
    }
  }

  private hideTooltip(): void {
    if (this.tooltip) {
      this.tooltip.style.display = 'none';
    }
  }

  private isOwnElement(target: EventTarget | Element | null): boolean {
    if (!target || !(target instanceof Element)) return false;

    return (
      target.id?.startsWith('prismify-ruler-') ||
      target.closest('#prismify-ruler-svg, #prismify-ruler-hover, #prismify-ruler-tooltip, #prismify-ruler-instructions') !== null
    );
  }

  // ==========================================================================
  // Utility: Notifications
  // ==========================================================================

  private showNotification(message: string, color: string): void {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: ${color};
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
      font-size: 14px;
      font-weight: bold;
      z-index: 2147483646;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      animation: prismify-ruler-fade 2s ease-in-out;
    `;
    notification.textContent = message;

    // Add animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes prismify-ruler-fade {
        0%, 100% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
        10%, 90% { opacity: 1; transform: translateX(-50%) translateY(0); }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
      style.remove();
    }, 2000);
  }

  private showWelcomeMessage(): void {
    const instructions = document.createElement('div');
    instructions.id = 'prismify-ruler-instructions';
    instructions.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 16px 20px;
      border-radius: 8px;
      font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
      font-size: 11px;
      z-index: 2147483647;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      line-height: 1.6;
      max-width: 300px;
    `;

    instructions.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 8px; color: #60a5fa; font-size: 12px;">
        Ruler Controls
      </div>
      <div style="display: grid; grid-template-columns: auto 1fr; gap: 4px 12px;">
        <span style="color: #9ca3af;">Drag:</span>
        <span>Measure distance</span>

        <span style="color: #9ca3af;">Shift + Drag:</span>
        <span>Keep measurements</span>

        <span style="color: #9ca3af;">E:</span>
        <span>Toggle Inspect mode</span>

        <span style="color: #9ca3af;">S:</span>
        <span>Toggle Snap</span>

        <span style="color: #9ca3af;">U:</span>
        <span>Toggle Unit (px/rem)</span>

        <span style="color: #9ca3af;">C:</span>
        <span>Clear measurements</span>

        <span style="color: #9ca3af;">Ctrl+C:</span>
        <span>Copy last measurement</span>

        <span style="color: #9ca3af;">ESC:</span>
        <span>Cancel/Clear</span>
      </div>
      <div style="margin-top: 12px; padding-top: 8px; border-top: 1px solid #374151; font-size: 10px; color: #6b7280;">
        Click anywhere to dismiss
      </div>
    `;

    instructions.addEventListener('click', () => instructions.remove());
    document.body.appendChild(instructions);

    // Auto-dismiss after 10 seconds
    setTimeout(() => {
      if (instructions.parentElement) {
        instructions.style.transition = 'opacity 0.5s';
        instructions.style.opacity = '0';
        setTimeout(() => instructions.remove(), 500);
      }
    }, 10000);
  }
}
