import { jsxDEV } from "react/jsx-dev-runtime";
import React from "react";
import * as THREE from "three";
import { useCurrentFrame } from "remotion";
const StarfieldBackground = () => {
  const canvasRef = React.useRef(null);
  const sceneRef = React.useRef(null);
  const cameraRef = React.useRef(null);
  const rendererRef = React.useRef(null);
  const starsRef = React.useRef(null);
  React.useEffect(() => {
    if (!canvasRef.current) return;
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(60, 540 / 960, 1, 1e3);
    camera.position.z = 1;
    cameraRef.current = camera;
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true
    });
    renderer.setSize(540, 960);
    renderer.setPixelRatio(1);
    renderer.setClearColor(1710638, 1);
    rendererRef.current = renderer;
    const starCount = 8e3;
    const starVertices = [];
    const starVelocities = [];
    const starSizes = [];
    for (let i = 0; i < starCount; i++) {
      const x = (Math.random() - 0.5) * 2e3;
      const y = (Math.random() - 0.5) * 2e3;
      const z = Math.random() * -2e3;
      starVertices.push(x, y, z);
      starVelocities.push(0, 0, 0.5 + Math.random() * 1);
      starSizes.push(1 + Math.random() * 2);
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute("position", new THREE.Float32BufferAttribute(starVertices, 3));
    starGeometry.setAttribute("velocity", new THREE.Float32BufferAttribute(starVelocities, 3));
    starGeometry.setAttribute("size", new THREE.Float32BufferAttribute(starSizes, 1));
    const starMaterial = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(16777215) }
      },
      vertexShader: `
                attribute float size;
                attribute vec3 velocity;
                varying float vAlpha;
                void main() {
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = size * (300.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
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
      depthTest: false
    });
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);
    starsRef.current = stars;
    return () => {
      starGeometry.dispose();
      starMaterial.dispose();
      renderer.dispose();
    };
  }, []);
  const frame = useCurrentFrame();
  React.useEffect(() => {
    if (!starsRef.current || !rendererRef.current || !sceneRef.current || !cameraRef.current) return;
    const stars = starsRef.current;
    const positions = stars.geometry.attributes.position.array;
    const velocities = stars.geometry.attributes.velocity.array;
    for (let i = 0; i < positions.length; i += 3) {
      positions[i + 2] += velocities[i + 2] * 2;
      if (positions[i + 2] > cameraRef.current.position.z) {
        positions[i] = (Math.random() - 0.5) * 2e3;
        positions[i + 1] = (Math.random() - 0.5) * 2e3;
        positions[i + 2] = -2e3;
      }
    }
    stars.geometry.attributes.position.needsUpdate = true;
    rendererRef.current.render(sceneRef.current, cameraRef.current);
  }, [frame]);
  return /* @__PURE__ */ jsxDEV(
    "canvas",
    {
      ref: canvasRef,
      style: {
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 0
      }
    },
    void 0,
    false,
    {
      fileName: "<stdin>",
      lineNumber: 123,
      columnNumber: 9
    }
  );
};
export {
  StarfieldBackground
};
