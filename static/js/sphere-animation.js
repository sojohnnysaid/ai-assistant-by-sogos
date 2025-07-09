/**
 * Sphere Animation using Three.js
 * Based on the sphere-animation-example with specified settings
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

// Shader code from sphere-animation-example
const vertexShader = `
  vec3 mod289(vec3 x)
  {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
  }

  vec4 mod289(vec4 x)
  {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
  }

  vec4 permute(vec4 x)
  {
    return mod289(((x*34.0)+1.0)*x);
  }

  vec4 taylorInvSqrt(vec4 r)
  {
    return 1.79284291400159 - 0.85373472095314 * r;
  }

  vec3 fade(vec3 t) {
    return t*t*t*(t*(t*6.0-15.0)+10.0);
  }

  // Classic Perlin noise
  float cnoise(vec3 P)
  {
    vec3 Pi0 = floor(P); // Integer part for indexing
    vec3 Pi1 = Pi0 + vec3(1.0); // Integer part + 1
    Pi0 = mod289(Pi0);
    Pi1 = mod289(Pi1);
    vec3 Pf0 = fract(P); // Fractional part for interpolation
    vec3 Pf1 = Pf0 - vec3(1.0); // Fractional part - 1.0
    vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
    vec4 iy = vec4(Pi0.yy, Pi1.yy);
    vec4 iz0 = Pi0.zzzz;
    vec4 iz1 = Pi1.zzzz;

    vec4 ixy = permute(permute(ix) + iy);
    vec4 ixy0 = permute(ixy + iz0);
    vec4 ixy1 = permute(ixy + iz1);

    vec4 gx0 = ixy0 * (1.0 / 7.0);
    vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
    gx0 = fract(gx0);
    vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
    vec4 sz0 = step(gz0, vec4(0.0));
    gx0 -= sz0 * (step(0.0, gx0) - 0.5);
    gy0 -= sz0 * (step(0.0, gy0) - 0.5);

    vec4 gx1 = ixy1 * (1.0 / 7.0);
    vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
    gx1 = fract(gx1);
    vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
    vec4 sz1 = step(gz1, vec4(0.0));
    gx1 -= sz1 * (step(0.0, gx1) - 0.5);
    gy1 -= sz1 * (step(0.0, gy1) - 0.5);

    vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
    vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
    vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
    vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
    vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
    vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
    vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
    vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);

    vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
    g000 *= norm0.x;
    g010 *= norm0.y;
    g100 *= norm0.z;
    g110 *= norm0.w;
    vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
    g001 *= norm1.x;
    g011 *= norm1.y;
    g101 *= norm1.z;
    g111 *= norm1.w;

    float n000 = dot(g000, Pf0);
    float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
    float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
    float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
    float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
    float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
    float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
    float n111 = dot(g111, Pf1);

    vec3 fade_xyz = fade(Pf0);
    vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
    vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
    float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
    return 2.2 * n_xyz;
  }

  uniform float u_time;
  uniform float u_speed;
  uniform float u_intensity;
  uniform float u_partical_size;
  uniform vec3 u_color_a;
  varying vec2 v_uv;
  varying float v_displacement;

  void main() {
    v_uv = uv;
    v_displacement = cnoise(position + vec3(u_time * u_speed));
    v_displacement = v_displacement * u_intensity;
    vec3 pos = position + (v_displacement);
    vec4 modelPosition = modelMatrix * vec4(pos, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;

    gl_Position = projectedPosition;
    gl_PointSize = u_partical_size * (1.0 / - viewPosition.z);
  }
`;

const fragmentShader = `
  uniform float u_time;
  uniform vec3 u_color_a;
  uniform vec3 u_color_b;
  varying vec2 v_uv;
  varying float v_displacement;

  void main() {
    float strength = distance(gl_PointCoord, vec2(0.5));
    strength = step(0.5, strength);
    strength = 1.0 - strength;

    vec3 color = mix(u_color_a, u_color_b, v_displacement);
    color = mix(vec3(0.0), color, strength);
    gl_FragColor = vec4(color, 1.0);
  }
`;

export class SphereAnimation {
    constructor(container) {
        this.container = container;
        this.isListening = false;
        
        // Settings from NOTES.md.js
        this.settings = {
            colorA: '#0b435f',
            colorB: '#9230aa',
            speed: 0.30,
            intensityIdle: 0.02,
            intensityTalking: 0.20,
            particleSizeIdle: 15,
            particleSizeTalking: 35
        };
        
        this.init();
    }

    init() {
        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color('#070707');

        // Camera
        const aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
        this.camera.position.set(8, 0, 0);
        this.camera.lookAt(0, 0, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true 
        });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);

        // Clear any placeholder content
        const placeholder = this.container.querySelector('div');
        if (placeholder) placeholder.remove();

        // Create sphere
        this.createSphere();

        // Handle resize
        window.addEventListener('resize', () => this.onWindowResize());

        // Start animation
        this.animate();
    }

    createSphere() {
        // Geometry
        const geometry = new THREE.IcosahedronGeometry(2, 20);

        // Uniforms
        this.uniforms = {
            u_time: { value: 0.0 },
            u_speed: { value: this.settings.speed },
            u_intensity: { value: this.settings.intensityIdle },
            u_partical_size: { value: this.settings.particleSizeIdle },
            u_color_a: { value: new THREE.Color(this.settings.colorA) },
            u_color_b: { value: new THREE.Color(this.settings.colorB) }
        };

        // Material
        const material = new THREE.ShaderMaterial({
            uniforms: this.uniforms,
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        // Points
        this.sphere = new THREE.Points(geometry, material);
        this.sphere.scale.set(1.5, 1.5, 1.5);
        this.scene.add(this.sphere);
    }

    onWindowResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(width, height);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        // Update time
        this.uniforms.u_time.value = performance.now() * 0.001;

        // Smoothly interpolate intensity and particle size
        const targetIntensity = this.isListening ? this.settings.intensityTalking : this.settings.intensityIdle;
        const targetParticleSize = this.isListening ? this.settings.particleSizeTalking : this.settings.particleSizeIdle;
        
        this.uniforms.u_intensity.value += (targetIntensity - this.uniforms.u_intensity.value) * 0.1;
        this.uniforms.u_partical_size.value += (targetParticleSize - this.uniforms.u_partical_size.value) * 0.1;

        // Rotate sphere
        this.sphere.rotation.y += 0.002;

        this.renderer.render(this.scene, this.camera);
    }

    setListening(isListening) {
        this.isListening = isListening;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('sphereContainer');
    if (container) {
        window.sphereAnimation = new SphereAnimation(container);
        
        // Connect to audio visualization state
        const originalUpdateButton = window.updateTranscriptionButton;
        if (originalUpdateButton) {
            window.updateTranscriptionButton = (isActive) => {
                originalUpdateButton(isActive);
                window.sphereAnimation.setListening(isActive);
            };
        }
    }
});