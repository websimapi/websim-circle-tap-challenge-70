import { hsl } from 'd3-color';
import { getAudioData } from './audio.js';
import { difficulties } from './game-config.js';

export class GameRenderer {
    constructor(canvas, colors) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.colors = colors;
        this.devicePixelRatio = window.devicePixelRatio || 1;
        
        // Dimensions calculated on resize
        this.size = 0;
        this.radius = 0;
        this.lineWidth = 0;
        this.currentDifficulty = 'easy';
    }

    resize(difficulty) {
        this.currentDifficulty = difficulty;
        const parent = this.canvas.parentElement;
        if (!parent) return; // Guard if removed from DOM
        
        const parentWidth = parent.offsetWidth;
        const parentHeight = parent.offsetHeight;
        const minDimension = Math.min(parentWidth, parentHeight);
        
        const canvasSize = minDimension * 0.9;
        
        this.canvas.style.width = `${canvasSize}px`;
        this.canvas.style.height = `${canvasSize}px`;

        this.size = canvasSize * this.devicePixelRatio;
        this.canvas.width = this.size;
        this.canvas.height = this.size;
        
        this.radius = this.size * 0.4;
        this.lineWidth = this.size * difficulties[this.currentDifficulty].trackWidthFactor;
        
        return {
            size: this.size,
            radius: this.radius,
            lineWidth: this.lineWidth
        };
    }

    drawVisualizer(pulseAmount, currentColorHsl) {
        if (pulseAmount <= 0.1) return;

        const centerX = this.size / 2;
        const centerY = this.size / 2;
        const outerRadius = this.radius + this.lineWidth / 2;
        const innerRadius = this.radius - this.lineWidth / 2;

        const pulseColor = currentColorHsl.copy({opacity: pulseAmount * 0.3});

        // --- Outer Pulse ---
        const maxOuterPulse = this.lineWidth * 0.8;
        const pulseOuterRadius = outerRadius + (pulseAmount * maxOuterPulse);
        
        const outerGradient = this.ctx.createRadialGradient(centerX, centerY, outerRadius, centerX, centerY, pulseOuterRadius);
        outerGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        outerGradient.addColorStop(0.8, pulseColor.toString());
        outerGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        this.ctx.fillStyle = outerGradient;
        this.ctx.fillRect(0, 0, this.size, this.size);

        // --- Inner Pulse ---
        const maxInnerPulse = innerRadius * 0.7; 
        const pulseInnerRadius = innerRadius - (pulseAmount * maxInnerPulse);

        const innerGradient = this.ctx.createRadialGradient(centerX, centerY, pulseInnerRadius, centerX, centerY, innerRadius);
        innerGradient.addColorStop(0, 'rgba(0,0,0,0)');
        innerGradient.addColorStop(0.5, pulseColor.toString());
        innerGradient.addColorStop(1, 'rgba(0,0,0,0)');

        this.ctx.fillStyle = innerGradient;
        this.ctx.fillRect(0, 0, this.size, this.size);
    }

    draw(state) {
        this.ctx.clearRect(0, 0, this.size, this.size);

        const { 
            currentColorHsl, 
            targetSize, 
            targetStartAngle, 
            failTap, 
            angle, 
            replayFrame 
        } = state;

        // Visualizer
        const audioData = getAudioData();
        let pulseAmount = 0;
        if (audioData) {
            let bass = 0;
            for (let i = 0; i < 5; i++) {
                bass += audioData[i];
            }
            bass /= 5;
            pulseAmount = (bass / 255);
            this.drawVisualizer(pulseAmount, currentColorHsl);
        }

        // Store pulse for replay
        if(replayFrame) {
            replayFrame.pulseAmount = pulseAmount;
        }

        this.ctx.save();
        this.ctx.translate(this.size / 2, this.size / 2);

        // Draw track
        this.ctx.beginPath();
        this.ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        this.ctx.strokeStyle = this.colors.secondary;
        this.ctx.lineWidth = this.lineWidth;
        this.ctx.lineCap = 'butt';
        this.ctx.stroke();

        // Draw target zone
        if (targetSize > 0) {
            this.ctx.beginPath();
            this.ctx.arc(0, 0, this.radius, targetStartAngle, targetStartAngle + targetSize);
            this.ctx.strokeStyle = currentColorHsl.toString();
            this.ctx.lineWidth = this.lineWidth * 0.95;
            this.ctx.lineCap = 'round';
            this.ctx.stroke();
        }

        // Draw fail tap indicator
        if (failTap) {
            const age = (performance.now() - failTap.timestamp) / 1000;
            if (age < 3) {
                const opacity = Math.max(0, 1 - (age / 3));
                const failColor = hsl(this.colors.fail);
                failColor.opacity = opacity;
                const failColorStr = failColor.toString();

                this.ctx.save();
                this.ctx.rotate(failTap.angle);
                
                // Ghost cursor line
                this.ctx.beginPath();
                this.ctx.moveTo(this.radius - this.lineWidth / 2, 0);
                this.ctx.lineTo(this.radius + this.lineWidth / 2, 0);
                this.ctx.strokeStyle = failColorStr;
                this.ctx.lineWidth = this.lineWidth / 2.5;
                this.ctx.lineCap = 'butt';
                this.ctx.stroke();

                // 'X' mark
                const xSize = this.lineWidth * 0.4;
                this.ctx.translate(this.radius, 0);
                this.ctx.beginPath();
                this.ctx.moveTo(-xSize, -xSize);
                this.ctx.lineTo(xSize, xSize);
                this.ctx.moveTo(xSize, -xSize);
                this.ctx.lineTo(-xSize, xSize);
                this.ctx.strokeStyle = failColorStr;
                this.ctx.lineWidth = Math.max(2, this.size * 0.005);
                this.ctx.stroke();

                this.ctx.restore();
            }
        }

        // Draw rotating line
        this.ctx.rotate(angle);
        this.ctx.beginPath();
        this.ctx.moveTo(this.radius - this.lineWidth / 2, 0);
        this.ctx.lineTo(this.radius + this.lineWidth / 2, 0);
        this.ctx.strokeStyle = this.colors.fail;
        this.ctx.lineWidth = this.lineWidth / 2.5;
        this.ctx.lineCap = 'butt';
        this.ctx.stroke();
        
        this.ctx.restore();

        // Return if we are still showing the fail indicator for logic to know
        return !!failTap && ((performance.now() - failTap.timestamp) / 1000) < 3;
    }
}