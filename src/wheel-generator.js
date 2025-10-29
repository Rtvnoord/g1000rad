const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

class WheelGenerator {
    constructor(g1000Data) {
        this.g1000Data = g1000Data;
        this.canvasWidth = 800;
        this.canvasHeight = 800;
        this.centerX = this.canvasWidth / 2;
        this.centerY = this.canvasHeight / 2;
        this.wheelRadius = 350;
        this.segmentCount = Math.min(g1000Data.length, 100); // Limit segments for visibility
    }

    async generateSpinFrames(winningPosition, duration) {
        const fps = 30;
        const totalFrames = Math.floor((duration / 1000) * fps);
        const frames = [];

        // Calculate winning segment angle
        const segmentAngle = (2 * Math.PI) / this.segmentCount;
        const winningIndex = this.g1000Data.findIndex(entry => entry.position === winningPosition);
        const targetAngle = winningIndex * segmentAngle;

        // Calculate total rotation (multiple spins + target)
        const baseRotations = 5; // Number of full rotations
        const totalRotation = (baseRotations * 2 * Math.PI) + (2 * Math.PI - targetAngle);

        console.log(`Genereren van ${totalFrames} frames voor ${duration}ms animatie`);

        for (let frame = 0; frame < totalFrames; frame++) {
            const progress = frame / (totalFrames - 1);
            
            // Easing function for realistic spin (fast start, slow end)
            const easedProgress = this.easeOutCubic(progress);
            const currentRotation = totalRotation * easedProgress;

            const canvas = this.drawWheel(currentRotation, frame);
            frames.push(canvas.toBuffer('image/png'));

            if (frame % 10 === 0) {
                console.log(`Frame ${frame}/${totalFrames} gegenereerd`);
            }
        }

        console.log(`Alle ${frames.length} frames gegenereerd`);
        return frames;
    }

    drawWheel(rotation, frameNumber) {
        const canvas = createCanvas(this.canvasWidth, this.canvasHeight);
        const ctx = canvas.getContext('2d');

        // Background
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

        // Draw wheel background
        ctx.save();
        ctx.translate(this.centerX, this.centerY);
        ctx.rotate(rotation);

        // Draw segments
        const segmentAngle = (2 * Math.PI) / this.segmentCount;
        const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dda0dd', '#98d8c8'];

        for (let i = 0; i < this.segmentCount; i++) {
            const startAngle = i * segmentAngle;
            const endAngle = (i + 1) * segmentAngle;
            const color = colors[i % colors.length];

            // Draw segment
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, this.wheelRadius, startAngle, endAngle);
            ctx.closePath();
            ctx.fillStyle = color;
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Draw number
            if (i < this.g1000Data.length) {
                const textAngle = startAngle + segmentAngle / 2;
                const textRadius = this.wheelRadius * 0.7;
                const x = Math.cos(textAngle) * textRadius;
                const y = Math.sin(textAngle) * textRadius;

                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(textAngle + Math.PI / 2);
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 16px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(this.g1000Data[i].position.toString(), 0, 0);
                ctx.restore();
            }
        }

        ctx.restore();

        // Draw center circle
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, 30, 0, 2 * Math.PI);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Draw pointer
        ctx.beginPath();
        ctx.moveTo(this.centerX + this.wheelRadius + 20, this.centerY);
        ctx.lineTo(this.centerX + this.wheelRadius - 20, this.centerY - 15);
        ctx.lineTo(this.centerX + this.wheelRadius - 20, this.centerY + 15);
        ctx.closePath();
        ctx.fillStyle = '#ff4757';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw title
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('GRUNNEGER 1000', this.centerX, 60);

        return canvas;
    }

    easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }
}

module.exports = WheelGenerator;
