Architectural guidelines and production-ready code patterns for building scroll-driven 3D parallax web applications, smooth inertia scrolling, and 3D product shrink-to-dock choreography using Three.js and GSAP/ScrollTrigger.

Instructions
Scroll-Driven 3D Parallax & Product Docking Architecture
This skill provides the architectural framework, mathematics, and implementation patterns for building high-performance, immersive landing pages where 3D objects (products, vehicles, apparel, accessories) respond dynamically to scroll position—spinning, scaling down, translating across axes, and docking into target UI containers.

Core Architectural Pillars
Fixed 3D Viewport Layering:

The Three.js WebGL canvas is fixed (position: fixed; inset: 0; pointer-events: none; z-index: 10;) behind scrolling HTML/CSS sections (position: relative; z-index: 20;).
All interactive UI cards, headings, and CTA buttons exist as native DOM elements that scroll naturally over the background canvas.
Scroll-to-Progress Normalization (scrollProgress: 0.0 -> 1.0):

Scroll progress is calculated continuously via window.scrollY / (document.body.scrollHeight - window.innerHeight).
Never attach heavy state setters (useState) directly to window.addEventListener('scroll'). Always use requestAnimationFrame and smooth linear interpolation (lerp) to keep animations locked at 60–120 FPS.
Multi-Stage Choreography Function:

Divide total scroll length into distinct visual sections (e.g., Hero, Anatomy / Features, Exploded View, Docking / Customizer).
Map progress intervals (e.g., 0.0 - 0.25, 0.25 - 0.50, etc.) to smooth target transformations for position (x, y, z), rotation (rx, ry, rz), and scale (sx, sy, sz).
Production-Ready Vanilla JS + Three.js Implementation Pattern
Use this robust, self-contained template as the baseline architecture for any 3D scroll-parallax project:

import * as THREE from 'three';

export class ScrollParallax3DScene {
  constructor(containerElement) {
    this.container = containerElement;
    this.scrollProgress = 0;
    this.targetScrollProgress = 0;
    
    this.initScene();
    this.initLighting();
    this.initModel();
    this.initEvents();
    this.animate();
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x07080a);

    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.set(0, 0, 7);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.container.appendChild(this.renderer.domElement);
  }

  initLighting() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xfff7ed, 1.5);
    dirLight.position.set(5, 10, 7);
    this.scene.add(dirLight);

    const rimLight = new THREE.PointLight(0x38bdf8, 2, 10);
    rimLight.position.set(-5, -2, -3);
    this.scene.add(rimLight);
  }

  initModel() {
    // Replace with your dynamic geometry or loaded GLTF model group
    this.group = new THREE.Group();
    
    const geometry = new THREE.TorusKnotGeometry(1.2, 0.35, 128, 32);
    const material = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.9,
      roughness: 0.15
    });
    
    this.productMesh = new THREE.Mesh(geometry, material);
    this.group.add(this.productMesh);
    this.scene.add(this.group);
  }

  initEvents() {
    window.addEventListener('scroll', () => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      this.targetScrollProgress = maxScroll > 0 ? window.scrollY / maxScroll : 0;
    });

    window.addEventListener('resize', () => {
      const w = this.container.clientWidth;
      const h = this.container.clientHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    });
  }

  animate = () => {
    requestAnimationFrame(this.animate);

    // Smooth inertia interpolation (lerp)
    this.scrollProgress += (this.targetScrollProgress - this.scrollProgress) * 0.08;
    const p = this.scrollProgress;

    // --- MULTI-STAGE SCROLL CHOREOGRAPHY ---
    if (p < 0.33) {
      // Stage 1: Hero Section (Spinning & Floating)
      const stageP = p / 0.33;
      this.group.position.set(0, 0, 0);
      this.group.rotation.x = stageP * Math.PI * 2;
      this.group.rotation.y = stageP * Math.PI * 4;
      this.group.scale.setScalar(1.0);
    } 
    else if (p < 0.66) {
      // Stage 2: Feature / Anatomy Section (Shift to right, explode/rotate)
      const stageP = (p - 0.33) / 0.33;
      this.group.position.set(1.5 * stageP, -0.5 * stageP, -1 * stageP);
      this.group.rotation.y = Math.PI * 4 + stageP * Math.PI;
      this.group.scale.setScalar(1.0 - stageP * 0.2);
    } 
    else {
      // Stage 3: Endpoint / Docking Section (Shrink and dock into target container coordinates)
      const stageP = (p - 0.66) / 0.34;
      // Interpolate from right side down to bottom-right dock position
      this.group.position.set(
        THREE.MathUtils.lerp(1.5, -1.8, stageP),
        THREE.MathUtils.lerp(-0.5, -1.2, stageP),
        THREE.MathUtils.lerp(-1, 0.5, stageP)
      );
      this.group.rotation.y = Math.PI * 5 + stageP * Math.PI * 0.5;
      this.group.scale.setScalar(THREE.MathUtils.lerp(0.8, 0.38, stageP));
    }

    this.renderer.render(this.scene, this.camera);
  }
}
Best Practices for Production
Performance & FPS Locking:
Always clamp pixel ratio (Math.min(window.devicePixelRatio, 2)) to prevent heavy GPU rendering drops on Retina 4K/5K displays.
Responsive 3D Positioning:
When moving objects on mobile vs desktop, check window.innerWidth in your choreography math to adjust translation offsets (X and Y) so the product never overflows small viewports.
Clean Unmounting:
Always remove scroll listeners, cancel animation frames (cancelAnimationFrame), and dispose of geometries, materials, and WebGL contexts upon component unmount in React/Vue/Svelte apps.