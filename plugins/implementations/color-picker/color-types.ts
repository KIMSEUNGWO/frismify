export interface RGB {
    r: number; // 0-255
    g: number; // 0-255
    b: number; // 0-255
}

export interface HSL {
    h: number; // 0-360
    s: number; // 0-100
    l: number; // 0-100
}

export interface HSV {
    h: number; // 0-360
    s: number; // 0-100
    v: number; // 0-100
}

export interface CMYK {
    c: number; // 0-100
    m: number; // 0-100
    y: number; // 0-100
    k: number; // 0-100
}

export class ColorConverter {

    private static instance: ColorConverter;

    public static getInstance(): ColorConverter {
        if (!ColorConverter.instance) {
            ColorConverter.instance = new ColorConverter();
        }
        return ColorConverter.instance;
    }
    private constructor() {}

    hexToRgb(hex: string): RGB {
        const cleanHex = hex.replace('#', '');
        const r = parseInt(cleanHex.slice(0, 2), 16);
        const g = parseInt(cleanHex.slice(2, 4), 16);
        const b = parseInt(cleanHex.slice(4, 6), 16);
        return { r, g, b };
    }

    private toHex(n: number): string {
        const hex = Math.round(n).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }

    rgbToHex(rgb: RGB): string {
        return `#${this.toHex(rgb.r)}${this.toHex(rgb.g)}${this.toHex(rgb.b)}`.toUpperCase();
    }

    rgbToHsl(rgb: RGB): HSL {
        const r = rgb.r / 255;
        const g = rgb.g / 255;
        const b = rgb.b / 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const delta = max - min;

        let h = 0;
        let s = 0;
        const l = (max + min) / 2;

        if (delta !== 0) {
            s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);

            switch (max) {
                case r:
                    h = ((g - b) / delta + (g < b ? 6 : 0)) / 6;
                    break;
                case g:
                    h = ((b - r) / delta + 2) / 6;
                    break;
                case b:
                    h = ((r - g) / delta + 4) / 6;
                    break;
            }
        }

        return {
            h: Math.round(h * 360),
            s: Math.round(s * 100),
            l: Math.round(l * 100),
        };
    }

    rgbToHsv(rgb: RGB): HSV {
        const r = rgb.r / 255;
        const g = rgb.g / 255;
        const b = rgb.b / 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const delta = max - min;

        let h = 0;
        const s = max === 0 ? 0 : delta / max;
        const v = max;

        if (delta !== 0) {
            switch (max) {
                case r:
                    h = ((g - b) / delta + (g < b ? 6 : 0)) / 6;
                    break;
                case g:
                    h = ((b - r) / delta + 2) / 6;
                    break;
                case b:
                    h = ((r - g) / delta + 4) / 6;
                    break;
            }
        }

        return {
            h: Math.round(h * 360),
            s: Math.round(s * 100),
            v: Math.round(v * 100),
        };
    }

    rgbToCmyk(rgb: RGB): CMYK {
        const r = rgb.r / 255;
        const g = rgb.g / 255;
        const b = rgb.b / 255;

        const k = 1 - Math.max(r, g, b);

        if (k === 1) {
            return { c: 0, m: 0, y: 0, k: 100 };
        }

        const c = (1 - r - k) / (1 - k);
        const m = (1 - g - k) / (1 - k);
        const y = (1 - b - k) / (1 - k);

        return {
            c: Math.round(c * 100),
            m: Math.round(m * 100),
            y: Math.round(y * 100),
            k: Math.round(k * 100),
        };
    }

    hslToRgb(hsl: HSL): RGB {
        const h = hsl.h / 360;
        const s = hsl.s / 100;
        const l = hsl.l / 100;

        let r: number, g: number, b: number;

        if (s === 0) {
            r = g = b = l; // achromatic
        } else {
            const hue2rgb = (p: number, q: number, t: number) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1 / 6) return p + (q - p) * 6 * t;
                if (t < 1 / 2) return q;
                if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                return p;
            };

            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;

            r = hue2rgb(p, q, h + 1 / 3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1 / 3);
        }

        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255),
        };
    }

    hsvToRgb(hsv: HSV): RGB {
        const h = hsv.h / 360;
        const s = hsv.s / 100;
        const v = hsv.v / 100;

        const i = Math.floor(h * 6);
        const f = h * 6 - i;
        const p = v * (1 - s);
        const q = v * (1 - f * s);
        const t = v * (1 - (1 - f) * s);

        let r: number, g: number, b: number;

        switch (i % 6) {
            case 0:
                r = v;
                g = t;
                b = p;
                break;
            case 1:
                r = q;
                g = v;
                b = p;
                break;
            case 2:
                r = p;
                g = v;
                b = t;
                break;
            case 3:
                r = p;
                g = q;
                b = v;
                break;
            case 4:
                r = t;
                g = p;
                b = v;
                break;
            case 5:
                r = v;
                g = p;
                b = q;
                break;
            default:
                r = g = b = 0;
        }

        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255),
        };
    }

    cmykToRgb(cmyk: CMYK): RGB {
        const c = cmyk.c / 100;
        const m = cmyk.m / 100;
        const y = cmyk.y / 100;
        const k = cmyk.k / 100;

        const r = 255 * (1 - c) * (1 - k);
        const g = 255 * (1 - m) * (1 - k);
        const b = 255 * (1 - y) * (1 - k);

        return {
            r: Math.round(r),
            g: Math.round(g),
            b: Math.round(b),
        };
    }

    format(color: RGB | HSL | HSV | CMYK): string {
        if ('r' in color) {
            // RGB 타입인 경우
            return `rgb(${color.r}, ${color.g}, ${color.b})`;
        }
        if ('l' in color) {
            // HSL 타입인 경우
            return `hsl(${color.h}, ${color.s}%, ${color.l}%)`;
        }
        if ('v' in color) {
            // HSV 타입인 경우
            return `hsv(${color.h}, ${color.s}%, ${color.v}%)`;
        }
        if ('c' in color) {
            // CMYK 타입인 경우
            return `cmyk(${color.c}%, ${color.m}%, ${color.y}%, ${color.k}%)`;
        }
    }
}

export const colorConverter = ColorConverter.getInstance();