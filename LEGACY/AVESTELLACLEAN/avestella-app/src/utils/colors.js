// Generates a random vibrant color that is not too dark
export function getRandomColor() {
    const hue = Math.floor(Math.random() * 360);
    const saturation = 70 + Math.floor(Math.random() * 30); // 70-100%
    const lightness = 50 + Math.floor(Math.random() * 30); // 50-80%
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

// Helper to convert HSL to Hex if needed for compatibility, 
// though standard Canvas/CSS supports HSL strings directly.
export function hslToHex(h, s, l) {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = n => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}
