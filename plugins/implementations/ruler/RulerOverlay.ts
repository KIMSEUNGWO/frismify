import { PluginManager } from '@/core';

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
  padding: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  border: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  margin: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

export class RulerOverlay {
  private svg: SVGSVGElement | null = null;
  private measurementGroup: SVGGElement | null = null;
  private hoverOverlay: HTMLDivElement | null = null;
  private tooltip: HTMLDivElement | null = null;

  private isDragging = false;
  private startPoint: Point | null = null;
  private currentPoint: Point | null = null;
  private measurements: Measurement[] = [];
  private measurementCounter = 0;

  private mode: 'measure' | 'inspect' = 'measure';
  private snapEnabled = true;
  private unit: 'px' | 'rem' = 'px';
  private lineColor = '#3B82F6';
  private baseFontSize = 16;

  private pluginId: string;

  constructor(pluginId: string) {
    this.pluginId = pluginId;
  }

  async init(): Promise<void> {
    await this.loadSettings();
    this.createSVGOverlay();
    this.createHoverOverlay();
    this.createTooltip();
    this.attachEventListeners();
    this.showInstructions();
  }

  private async loadSettings(): Promise<void> {
    const manager = PluginManager.getInstance();
    const settings = await manager.getSettings(this.pluginId);

    this.snapEnabled = settings.snapToElements ?? true;
    this.unit = settings.unit ?? 'px';
    this.lineColor = settings.lineColor ?? '#3B82F6';
    this.mode = settings.defaultMode ?? 'measure';
  }

  private createSVGOverlay(): void {
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.id = 'ruler-svg-overlay';
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
    this.measurementGroup.id = 'ruler-measurements';
    this.svg.appendChild(this.measurementGroup);

    document.body.appendChild(this.svg);
  }

  private createHoverOverlay(): void {
    this.hoverOverlay = document.createElement('div');
    this.hoverOverlay.id = 'ruler-hover-overlay';
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
    this.tooltip.id = 'ruler-tooltip';
    this.tooltip.style.cssText = `
      position: fixed;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-family: 'Monaco', 'Menlo', monospace;
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

  private attachEventListeners(): void {
    document.addEventListener('mousedown', this.handleMouseDown);
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('mouseup', this.handleMouseUp);
    document.addEventListener('keydown', this.handleKeyDown);
  }

  private handleMouseDown = (e: MouseEvent): void => {
    if (e.target instanceof HTMLElement) {
      if (e.target.closest('#ruler-tooltip') ||
          e.target.closest('#ruler-instructions')) {
        return;
      }
    }

    if (this.mode === 'measure') {
      const point = this.getPoint(e);
      this.startPoint = this.snapEnabled ? this.snapToElement(point, e) : point;
      this.isDragging = true;
      this.hideTooltip();
    }
  };

  private handleMouseMove = (e: MouseEvent): void => {
    if (this.mode === 'measure' && this.isDragging && this.startPoint) {
      const point = this.getPoint(e);
      this.currentPoint = this.snapEnabled ? this.snapToElement(point, e) : point;
      this.drawCurrentMeasurement();
    } else if (this.mode === 'inspect') {
      this.handleInspect(e);
    }
  };

  private handleMouseUp = (e: MouseEvent): void => {
    if (this.mode === 'measure' && this.isDragging && this.startPoint && this.currentPoint) {
      if (!e.shiftKey) {
        this.clearMeasurements();
      }
      this.saveMeasurement();
      this.isDragging = false;
      this.startPoint = null;
      this.currentPoint = null;
    }
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    switch (e.key.toLowerCase()) {
      case 'escape':
        this.clearMeasurements();
        this.startPoint = null;
        this.currentPoint = null;
        this.isDragging = false;
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
  };

  private getPoint(e: MouseEvent): Point {
    return {
      x: e.clientX,
      y: e.clientY,
    };
  }

  private snapToElement(point: Point, e: MouseEvent): Point {
    const target = document.elementFromPoint(point.x, point.y);
    if (!target || target.id === 'ruler-svg-overlay') {
      return point;
    }

    const rect = target.getBoundingClientRect();
    const snapThreshold = 10;

    const edges = {
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
      centerX: rect.left + rect.width / 2,
      centerY: rect.top + rect.height / 2,
    };

    let snappedX = point.x;
    let snappedY = point.y;

    for (const [key, value] of Object.entries(edges)) {
      if (key.includes('X') || key === 'left' || key === 'right') {
        if (Math.abs(point.x - value) < snapThreshold) {
          snappedX = value;
        }
      }
      if (key.includes('Y') || key === 'top' || key === 'bottom') {
        if (Math.abs(point.y - value) < snapThreshold) {
          snappedY = value;
        }
      }
    }

    return { x: snappedX, y: snappedY };
  }

  private drawCurrentMeasurement(): void {
    if (!this.svg || !this.startPoint || !this.currentPoint) return;

    const existingTemp = this.svg.querySelector('#temp-measurement');
    if (existingTemp) {
      existingTemp.remove();
    }

    const group = this.createMeasurementGroup(
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
      diagonal: Math.sqrt(
        Math.pow(this.currentPoint.x - this.startPoint.x, 2) +
        Math.pow(this.currentPoint.y - this.startPoint.y, 2)
      ),
    };

    this.measurements.push(measurement);

    const existingTemp = this.svg?.querySelector('#temp-measurement');
    if (existingTemp) {
      existingTemp.remove();
    }

    const group = this.createMeasurementGroup(
      measurement.start,
      measurement.end,
      measurement.id,
      false
    );

    this.measurementGroup.appendChild(group);
  }

  private createMeasurementGroup(
    start: Point,
    end: Point,
    id: string,
    isTemp: boolean
  ): SVGGElement {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.id = id;

    const horizontal = Math.abs(end.x - start.x);
    const vertical = Math.abs(end.y - start.y);
    const diagonal = Math.sqrt(
      Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
    );

    const opacity = isTemp ? '0.7' : '1';
    const strokeWidth = isTemp ? '1.5' : '1';

    // Diagonal line (main)
    const diagonalLine = this.createLine(
      start.x, start.y, end.x, end.y,
      this.lineColor, '2', opacity
    );
    group.appendChild(diagonalLine);

    // Horizontal guide
    if (horizontal > 5) {
      const horizontalLine = this.createLine(
        start.x, start.y, end.x, start.y,
        this.lineColor, strokeWidth, opacity, '4,4'
      );
      group.appendChild(horizontalLine);

      const hLabel = this.createLabel(
        (start.x + end.x) / 2,
        start.y - 8,
        this.formatValue(horizontal),
        this.lineColor
      );
      group.appendChild(hLabel);
    }

    // Vertical guide
    if (vertical > 5) {
      const verticalLine = this.createLine(
        end.x, start.y, end.x, end.y,
        this.lineColor, strokeWidth, opacity, '4,4'
      );
      group.appendChild(verticalLine);

      const vLabel = this.createLabel(
        end.x + 8,
        (start.y + end.y) / 2,
        this.formatValue(vertical),
        this.lineColor
      );
      group.appendChild(vLabel);
    }

    // Diagonal label
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    const angle = Math.atan2(end.y - start.y, end.x - start.x) * (180 / Math.PI);
    const offset = 15;
    const labelX = midX + offset * Math.sin(angle * Math.PI / 180);
    const labelY = midY - offset * Math.cos(angle * Math.PI / 180);

    const dLabel = this.createLabel(
      labelX,
      labelY,
      this.formatValue(diagonal),
      this.lineColor,
      true
    );
    group.appendChild(dLabel);

    // Start and end markers
    group.appendChild(this.createMarker(start.x, start.y, this.lineColor));
    group.appendChild(this.createMarker(end.x, end.y, this.lineColor));

    return group;
  }

  private createLine(
    x1: number, y1: number, x2: number, y2: number,
    color: string, width: string, opacity: string, dasharray?: string
  ): SVGLineElement {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1.toString());
    line.setAttribute('y1', y1.toString());
    line.setAttribute('x2', x2.toString());
    line.setAttribute('y2', y2.toString());
    line.setAttribute('stroke', color);
    line.setAttribute('stroke-width', width);
    line.setAttribute('opacity', opacity);
    if (dasharray) {
      line.setAttribute('stroke-dasharray', dasharray);
    }
    return line;
  }

  private createLabel(
    x: number, y: number, text: string, color: string, bold: boolean = false
  ): SVGTextElement {
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', x.toString());
    label.setAttribute('y', y.toString());
    label.setAttribute('fill', '#fff');
    label.setAttribute('font-size', '12');
    label.setAttribute('font-family', 'Monaco, Menlo, monospace');
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('dominant-baseline', 'middle');
    if (bold) {
      label.setAttribute('font-weight', 'bold');
    }
    label.style.textShadow = '0 0 4px rgba(0,0,0,0.8), 0 0 2px rgba(0,0,0,1)';
    label.style.pointerEvents = 'none';
    label.textContent = text;

    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    const bbox = label.getBBox();
    bg.setAttribute('x', (bbox.x - 4).toString());
    bg.setAttribute('y', (bbox.y - 2).toString());
    bg.setAttribute('width', (bbox.width + 8).toString());
    bg.setAttribute('height', (bbox.height + 4).toString());
    bg.setAttribute('fill', color);
    bg.setAttribute('rx', '4');
    bg.style.pointerEvents = 'none';

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.appendChild(bg);
    g.appendChild(label);

    return g as any;
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

  private formatValue(px: number): string {
    if (this.unit === 'rem') {
      const rem = px / this.baseFontSize;
      return `${rem.toFixed(2)}rem`;
    }
    return `${Math.round(px)}px`;
  }

  private handleInspect(e: MouseEvent): void {
    const target = document.elementFromPoint(e.clientX, e.clientY);
    if (!target ||
        target.id === 'ruler-hover-overlay' ||
        target.id === 'ruler-svg-overlay' ||
        target.closest('#ruler-tooltip')) {
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

    // Content
    const content = this.createBoxDiv(
      rect.left, rect.top, rect.width, rect.height,
      'rgba(59, 130, 246, 0.3)', '2px solid #3B82F6'
    );
    this.hoverOverlay.appendChild(content);

    // Padding
    const paddingTop = this.createBoxDiv(
      rect.left - boxModel.padding.left,
      rect.top - boxModel.padding.top,
      rect.width + boxModel.padding.left + boxModel.padding.right,
      boxModel.padding.top,
      'rgba(147, 197, 253, 0.3)'
    );
    this.hoverOverlay.appendChild(paddingTop);

    const paddingBottom = this.createBoxDiv(
      rect.left - boxModel.padding.left,
      rect.bottom,
      rect.width + boxModel.padding.left + boxModel.padding.right,
      boxModel.padding.bottom,
      'rgba(147, 197, 253, 0.3)'
    );
    this.hoverOverlay.appendChild(paddingBottom);

    const paddingLeft = this.createBoxDiv(
      rect.left - boxModel.padding.left,
      rect.top,
      boxModel.padding.left,
      rect.height,
      'rgba(147, 197, 253, 0.3)'
    );
    this.hoverOverlay.appendChild(paddingLeft);

    const paddingRight = this.createBoxDiv(
      rect.right,
      rect.top,
      boxModel.padding.right,
      rect.height,
      'rgba(147, 197, 253, 0.3)'
    );
    this.hoverOverlay.appendChild(paddingRight);

    // Margin
    const marginTop = this.createBoxDiv(
      rect.left - boxModel.padding.left - boxModel.border.left - boxModel.margin.left,
      rect.top - boxModel.padding.top - boxModel.border.top - boxModel.margin.top,
      rect.width + boxModel.padding.left + boxModel.padding.right + boxModel.border.left + boxModel.border.right + boxModel.margin.left + boxModel.margin.right,
      boxModel.margin.top,
      'rgba(251, 191, 36, 0.2)'
    );
    this.hoverOverlay.appendChild(marginTop);

    const marginBottom = this.createBoxDiv(
      rect.left - boxModel.padding.left - boxModel.border.left - boxModel.margin.left,
      rect.bottom + boxModel.padding.bottom + boxModel.border.bottom,
      rect.width + boxModel.padding.left + boxModel.padding.right + boxModel.border.left + boxModel.border.right + boxModel.margin.left + boxModel.margin.right,
      boxModel.margin.bottom,
      'rgba(251, 191, 36, 0.2)'
    );
    this.hoverOverlay.appendChild(marginBottom);

    const marginLeft = this.createBoxDiv(
      rect.left - boxModel.padding.left - boxModel.border.left - boxModel.margin.left,
      rect.top - boxModel.padding.top - boxModel.border.top,
      boxModel.margin.left,
      rect.height + boxModel.padding.top + boxModel.padding.bottom + boxModel.border.top + boxModel.border.bottom,
      'rgba(251, 191, 36, 0.2)'
    );
    this.hoverOverlay.appendChild(marginLeft);

    const marginRight = this.createBoxDiv(
      rect.right + boxModel.padding.right + boxModel.border.right,
      rect.top - boxModel.padding.top - boxModel.border.top,
      boxModel.margin.right,
      rect.height + boxModel.padding.top + boxModel.padding.bottom + boxModel.border.top + boxModel.border.bottom,
      'rgba(251, 191, 36, 0.2)'
    );
    this.hoverOverlay.appendChild(marginRight);
  }

  private createBoxDiv(
    left: number, top: number, width: number, height: number,
    background: string, border?: string
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

  private showElementInfo(element: HTMLElement, e: MouseEvent): void {
    if (!this.tooltip) return;

    const styles = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const boxModel = this.getBoxModel(element);

    const tagName = element.tagName.toLowerCase();
    const className = element.className ? `.${element.className.toString().split(' ').join('.')}` : '';
    const selector = `${tagName}${className}`;

    this.tooltip.innerHTML = `
      <div style="color: #60a5fa; font-weight: bold; margin-bottom: 8px;">
        ${selector}
      </div>
      <div style="display: grid; grid-template-columns: auto 1fr; gap: 8px 12px; font-size: 11px;">
        <span style="color: #9ca3af;">Size:</span>
        <span>${Math.round(rect.width)} × ${Math.round(rect.height)}px</span>

        <span style="color: #9ca3af;">Margin:</span>
        <span style="color: #fbbf24;">${Math.round(boxModel.margin.top)} ${Math.round(boxModel.margin.right)} ${Math.round(boxModel.margin.bottom)} ${Math.round(boxModel.margin.left)}</span>

        <span style="color: #9ca3af;">Padding:</span>
        <span style="color: #93c5fd;">${Math.round(boxModel.padding.top)} ${Math.round(boxModel.padding.right)} ${Math.round(boxModel.padding.bottom)} ${Math.round(boxModel.padding.left)}</span>

        <span style="color: #9ca3af;">Position:</span>
        <span>x:${Math.round(rect.left)}, y:${Math.round(rect.top)}</span>

        <span style="color: #9ca3af;">Display:</span>
        <span>${styles.display}</span>

        <span style="color: #9ca3af;">Font:</span>
        <span>${styles.fontSize} / ${styles.lineHeight}</span>
      </div>
      <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #374151; font-size: 10px; color: #6b7280;">
        Mode: <span style="color: #10b981;">INSPECT</span> • Press E to toggle
      </div>
    `;

    this.tooltip.style.display = 'block';

    const tooltipRect = this.tooltip.getBoundingClientRect();
    let left = e.clientX + 15;
    let top = e.clientY + 15;

    if (left + tooltipRect.width > window.innerWidth) {
      left = e.clientX - tooltipRect.width - 15;
    }
    if (top + tooltipRect.height > window.innerHeight) {
      top = e.clientY - tooltipRect.height - 15;
    }

    this.tooltip.style.left = `${left}px`;
    this.tooltip.style.top = `${top}px`;
  }

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

  private clearMeasurements(): void {
    this.measurements = [];
    if (this.measurementGroup) {
      this.measurementGroup.innerHTML = '';
    }
  }

  private toggleMode(): void {
    this.mode = this.mode === 'measure' ? 'inspect' : 'measure';
    this.hideHoverOverlay();
    this.hideTooltip();
    this.showModeNotification();
  }

  private toggleSnap(): void {
    this.snapEnabled = !this.snapEnabled;
    this.showNotification(`Snap: ${this.snapEnabled ? 'ON' : 'OFF'}`);
  }

  private toggleUnit(): void {
    this.unit = this.unit === 'px' ? 'rem' : 'px';
    this.showNotification(`Unit: ${this.unit}`);

    // Redraw all measurements with new unit
    const savedMeasurements = [...this.measurements];
    this.clearMeasurements();
    savedMeasurements.forEach(m => {
      this.measurements.push(m);
      const group = this.createMeasurementGroup(m.start, m.end, m.id, false);
      this.measurementGroup?.appendChild(group);
    });
  }

  private copyLastMeasurement(): void {
    if (this.measurements.length === 0) {
      this.showNotification('No measurements to copy');
      return;
    }

    const last = this.measurements[this.measurements.length - 1];
    const text = `Width: ${this.formatValue(last.horizontal)}, Height: ${this.formatValue(last.vertical)}, Diagonal: ${this.formatValue(last.diagonal)}`;

    navigator.clipboard.writeText(text).then(() => {
      this.showNotification('Copied to clipboard!');
    }).catch(() => {
      this.showNotification('Failed to copy');
    });
  }

  private showModeNotification(): void {
    const modeText = this.mode === 'measure' ? 'MEASURE' : 'INSPECT';
    const color = this.mode === 'measure' ? '#3B82F6' : '#10B981';
    this.showNotification(`Mode: ${modeText}`, color);
  }

  private showNotification(message: string, color: string = '#3B82F6'): void {
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
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 14px;
      font-weight: bold;
      z-index: 2147483647;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      animation: ruler-fade-in-out 2s ease-in-out;
    `;
    notification.textContent = message;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes ruler-fade-in-out {
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

  private showInstructions(): void {
    const instructions = document.createElement('div');
    instructions.id = 'ruler-instructions';
    instructions.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 16px 20px;
      border-radius: 8px;
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 11px;
      z-index: 2147483647;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      line-height: 1.6;
      max-width: 300px;
    `;

    instructions.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 8px; color: #60a5fa; font-size: 12px;">
        📐 Ruler Controls
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

    instructions.addEventListener('click', () => {
      instructions.remove();
    });

    document.body.appendChild(instructions);

    setTimeout(() => {
      if (instructions.parentElement) {
        instructions.style.transition = 'opacity 0.5s';
        instructions.style.opacity = '0';
        setTimeout(() => instructions.remove(), 500);
      }
    }, 10000);
  }

  destroy(): void {
    document.removeEventListener('mousedown', this.handleMouseDown);
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
    document.removeEventListener('keydown', this.handleKeyDown);

    this.svg?.remove();
    this.hoverOverlay?.remove();
    this.tooltip?.remove();

    const instructions = document.getElementById('ruler-instructions');
    instructions?.remove();
  }
}
