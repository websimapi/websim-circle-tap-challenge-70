import { hsl } from 'd3-color';

// Color generation based on level
export function getHslStringForLevel(level) {
    const hue = ((level - 1) * 40) % 360;
    return `hsl(${hue}, 100%, 60%)`;
}

// Robust hit detection for circular arcs
export function isAngleInArc(angleToCheck, arcStart, arcSize) {
    const twoPi = Math.PI * 2;
    const normAngle = (angleToCheck % twoPi + twoPi) % twoPi;
    const normArcStart = (arcStart % twoPi + twoPi) % twoPi;
    
    const normArcEnd = (normArcStart + arcSize) % twoPi;

    if (normArcStart < normArcEnd) {
        return normAngle >= normArcStart && normAngle <= normArcEnd;
    } else {
        return normAngle >= normArcStart || normAngle <= normArcEnd;
    }
}

export function getComputedColors() {
    const computedStyles = getComputedStyle(document.documentElement);
    return {
        secondary: computedStyles.getPropertyValue('--secondary-color'),
        success: computedStyles.getPropertyValue('--success-color'),
        fail: computedStyles.getPropertyValue('--fail-color')
    };
}

export function generateHeartSVG(idPrefix, index) {
    // A heart with a clip path for the fill
    const clipId = `${idPrefix}-clip-${index}`;
    return `
        <div class="heart-wrapper" id="${idPrefix}-heart-${index}">
             <svg class="heart-svg" viewBox="0 0 24 24">
                <defs>
                    <clipPath id="${clipId}">
                        <rect class="heart-fill-rect" x="0" y="0" width="24" height="24" />
                    </clipPath>
                </defs>
                <path class="heart-bg" fill="#330000" stroke="#550000" stroke-width="2" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                <path class="heart-fill" fill="#ff0000" clip-path="url(#${clipId})" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
        </div>
    `;
}