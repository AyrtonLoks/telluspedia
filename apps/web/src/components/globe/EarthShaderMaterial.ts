import * as THREE from "three";

export const EarthShader = {
  uniforms: {
    uSunDirection: { value: new THREE.Vector3(1, 0, 0) },
    uAtmosphereColor: { value: new THREE.Color("#00d4ff") },
    uDayOceanColor: { value: new THREE.Color("#0b192e") },
    uDayLandColor: { value: new THREE.Color("#16324f") },
    uNightOceanColor: { value: new THREE.Color("#02050b") },
    uNightCityColor: { value: new THREE.Color("#ffb74d") },
    uAtmospherePower: { value: 3.2 },
    uTime: { value: 0 },
  },

  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    varying vec2 vUv;

    void main() {
      vUv = uv;
      vNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: `
    uniform vec3 uSunDirection;
    uniform vec3 uAtmosphereColor;
    uniform vec3 uDayOceanColor;
    uniform vec3 uDayLandColor;
    uniform vec3 uNightOceanColor;
    uniform vec3 uNightCityColor;
    uniform float uAtmospherePower;
    uniform float uTime;

    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    varying vec2 vUv;

    // Pseudo-random and noise helpers for atmospheric cloud wisps & night lights
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
        u.y
      );
    }

    void main() {
      vec3 normal = normalize(vNormal);
      vec3 viewDir = normalize(cameraPosition - vWorldPosition);

      // Solar lighting (Lambertian dot product in world space)
      vec3 sunDir = normalize(uSunDirection);
      float nDotL = dot(normal, sunDir);

      // Terminator twilight gradient between night and day (-0.15 to +0.15)
      float dayFactor = smoothstep(-0.15, 0.15, nDotL);

      // Day Base Color: Deep navy oceanic tone with subtle topography nuances
      vec3 dayColor = mix(uDayOceanColor, uDayLandColor, 0.35);

      // Night Base: Dark abyss with scattered golden urban light clusters
      float cityNoise = noise(vUv * 80.0) * noise(vUv * 160.0);
      vec3 nightLights = uNightCityColor * smoothstep(0.48, 0.72, cityNoise) * 1.8;
      vec3 nightColor = uNightOceanColor + nightLights;

      // Golden sunset / sunrise ring along the solar terminator
      float sunsetRing = smoothstep(0.0, 0.15, 0.15 - abs(nDotL));
      vec3 sunsetColor = vec3(1.0, 0.55, 0.2) * sunsetRing * 0.45;

      // Composite earth surface
      vec3 surfaceColor = mix(nightColor, dayColor, dayFactor) + sunsetColor;

      // Fresnel Atmospheric Glow on the silhouette
      float fresnel = pow(1.0 - max(0.0, dot(viewDir, normal)), uAtmospherePower);
      vec3 atmosphereGlow = uAtmosphereColor * fresnel * 0.85;

      gl_FragColor = vec4(surfaceColor + atmosphereGlow, 1.0);
    }
  `,
};

export function createEarthMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(EarthShader.uniforms),
    vertexShader: EarthShader.vertexShader,
    fragmentShader: EarthShader.fragmentShader,
    transparent: false,
    depthWrite: true,
  });
}
