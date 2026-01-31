import { PowerUp } from '@/classes/PowerUp';

export function drawPowerUp(
    ctx: CanvasRenderingContext2D,
    powerup: PowerUp,
    timestamp: number
): void {
    const { x, y, r } = powerup;
    const color = powerup.getColor();
    const icon = powerup.getIcon();
    const pulse = powerup.getPulseScale();
    const radius = r * pulse;

    ctx.save();
    ctx.translate(x, y);

    // Glow
    const gradient = ctx.createRadialGradient(0, 0, radius * 0.5, 0, 0, radius * 2);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 2, 0, Math.PI * 2);
    ctx.fill();

    // Core
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    // Icon
    ctx.fillStyle = '#1a1a1a'; // Dark background for icon contrast
    ctx.font = `${radius}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon, 0, 2); // Slight offset for visual centering

    // Ring for time remaining
    const lifeRatio = powerup.getLifeRatio();
    if (lifeRatio < 1) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, radius + 4, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * lifeRatio));
        ctx.stroke();
    }

    ctx.restore();
}
