import * as THREE from 'three';

let scene, camera, renderer, stars;
const starCount = 8000;

function init() {
    const canvas = document.getElementById('background-canvas');
    if (!canvas) {
        console.error('Background canvas not found!');
        return;
    }

    // Scene
    scene = new THREE.Scene();

    // Camera
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.z = 1;

    // Renderer
    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: true 
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x1a1a2e, 1);

    // Stars
    const starVertices = [];
    const starVelocities = [];
    const starSizes = [];
    for (let i = 0; i < starCount; i++) {
        const x = (Math.random() - 0.5) * 2000;
        const y = (Math.random() - 0.5) * 2000;
        const z = Math.random() * -2000; 
        starVertices.push(x, y, z);
        starVelocities.push(0, 0, 0.5 + Math.random() * 1);
        starSizes.push(1 + Math.random() * 2);
    }

    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    starGeometry.setAttribute('velocity', new THREE.Float32BufferAttribute(starVelocities, 3));
    starGeometry.setAttribute('size', new THREE.Float32BufferAttribute(starSizes, 1));  

    // Shader Material for stars
    const starMaterial = new THREE.ShaderMaterial({
        uniforms: {
            color: { value: new THREE.Color(0xffffff) },
        },
        vertexShader: `
            attribute float size;
            attribute vec3 velocity;
            varying float vAlpha;
            void main() {
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = size * (300.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
                // Fade stars as they get closer to the edge of the view
                vAlpha = 1.0 - (abs(position.z) / 1000.0);
            }
        `,
        fragmentShader: `
            uniform vec3 color;
            varying float vAlpha;
            void main() {
                float r = 0.0, delta = 0.0, alpha = 1.0;
                vec2 cxy = 2.0 * gl_PointCoord - 1.0;
                r = dot(cxy, cxy);
                if (r > 1.0) {
                    discard;
                }
                gl_FragColor = vec4(color, vAlpha * (1.0 - r));
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthTest: false,
    });

    stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    // Event Listeners
    window.addEventListener('resize', onWindowResize, false);

    // Start animation
    animate();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}

function animate() {
    requestAnimationFrame(animate);

    if (stars) {
        const positions = stars.geometry.attributes.position.array;
        const velocities = stars.geometry.attributes.velocity.array;

        for (let i = 0; i < positions.length; i += 3) {
            positions[i + 2] += velocities[i + 2];

            if (positions[i + 2] > camera.position.z) {
                positions[i] = (Math.random() - 0.5) * 2000;
                positions[i+1] = (Math.random() - 0.5) * 2000;
                positions[i + 2] = -2000;
            }
        }
        stars.geometry.attributes.position.needsUpdate = true;
    }

    renderer.render(scene, camera);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}