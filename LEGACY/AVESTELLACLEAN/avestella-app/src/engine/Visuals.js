export class Particle {
    constructor(x, y, type = 'dust') {
        this.x = x;
        this.y = y;
        this.type = type;
        this.life = 1.0;

        switch (type) {
            case 'spark':
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 6 + 4;
                this.vx = Math.cos(angle) * speed;
                this.vy = Math.sin(angle) * speed;
                this.decay = 0.02;
                this.size = Math.random() * 5 + 2;
                this.color = '#FDB813'; // Bright gold
                break;
            case 'trail':
                this.vx = 0;
                this.vy = 0;
                this.decay = 0.02;
                this.size = Math.random() * 3 + 1;
                this.color = '#fbbf24';
                break;
            case 'storm':
                this.vx = (Math.random() - 0.5) * 8;
                this.vy = (Math.random() - 0.5) * 8;
                this.decay = 0.04;
                this.size = Math.random() * 2;
                this.color = '#94a3b8'; // Lighter slate for contrast
                break;
            case 'wave':
                const waveAngle = Math.random() * Math.PI * 2;
                const waveSpeed = 2 + Math.random() * 6;
                this.vx = Math.cos(waveAngle) * waveSpeed;
                this.vy = Math.sin(waveAngle) * waveSpeed;
                this.decay = 0.015;
                this.size = 2 + Math.random() * 3;
                this.color = '#FFFFFF'; // Pure white
                break;
            case 'bloom':
                this.vx = (Math.random() - 0.5) * 6;
                this.vy = (Math.random() - 0.5) * 6;
                this.decay = 0.02;
                this.size = Math.random() * 4 + 2;
                this.color = '#FDB813';
                break;
            case 'snap':
                const snapAngle = Math.random() * Math.PI * 2;
                const snapSpeed = 1 + Math.random() * 3;
                this.vx = Math.cos(snapAngle) * snapSpeed;
                this.vy = Math.sin(snapAngle) * snapSpeed;
                this.decay = 0.03;
                this.size = 1 + Math.random() * 2;
                this.color = '#e879f9';
                break;
            default: // dust
                this.vx = (Math.random() - 0.5) * 0.5;
                this.vy = (Math.random() - 0.5) * 0.5;
                this.decay = 0.005;
                this.size = Math.random() * 2;
                this.color = '#ffffff';
        }
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= this.decay;
    }
}

export class Ripple {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 20;
        this.life = 1.0;
    }

    update() {
        this.radius += 0.5;
        this.life -= 0.01;
    }
}

export class Shockwave {
    constructor(x, y, maxR = 300) {
        this.x = x;
        this.y = y;
        this.radius = 10;
        this.maxRadius = maxR;
        this.alpha = 1.0;
    }

    update() {
        this.radius += 8; // Faster shockwave expansion
        this.alpha -= 0.02;
        if (this.radius > this.maxRadius) this.alpha = 0;
    }
}
