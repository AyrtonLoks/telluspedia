import * as THREE from "three";

// 1x1 placeholder textures to ensure WebGL validity before textures finish loading
function createPlaceholderTexture(r: number, g: number, b: number): THREE.DataTexture {
  const data = new Uint8Array([r, g, b, 255]);
  const texture = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat);
  texture.needsUpdate = true;
  return texture;
}

export const EarthShader = {
  uniforms: {
    uSunDirection: { value: new THREE.Vector3(1, 0, 0) },
    uDayTexture: { value: createPlaceholderTexture(11, 25, 46) as THREE.Texture },
    uNightTexture: { value: createPlaceholderTexture(2, 5, 11) as THREE.Texture },
    uPaleoTexture: { value: null as THREE.Texture | null },
    uPaleoFactor: { value: 0.0 },
    uAtmosphereColor: { value: new THREE.Color("#00d4ff") },
    uAtmospherePower: { value: 3.2 },
    uTime: { value: 0 },
  },

  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    varying vec2 vUv;

    void main() {
      vUv = uv;
      // Invariant: Normal must be transformed to world space for astronomical sun direction dot product
      vNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: `
    uniform vec3 uSunDirection;
    uniform sampler2D uDayTexture;
    uniform sampler2D uNightTexture;
    uniform sampler2D uPaleoTexture;
    uniform float uPaleoFactor;
    uniform vec3 uAtmosphereColor;
    uniform float uAtmospherePower;
    uniform float uTime;

    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    varying vec2 vUv;

    void main() {
      vec3 normal = normalize(vNormal);
      vec3 viewDir = normalize(cameraPosition - vWorldPosition);

      // Solar lighting (Lambertian dot product in world space)
      vec3 sunDir = normalize(uSunDirection);
      float nDotL = dot(normal, sunDir);

      // Terminator twilight gradient between night and day (-0.15 to +0.15)
      float dayFactor = smoothstep(-0.15, 0.15, nDotL);

      // Sample day, night, and paleogeographic textures
      vec3 dayColor = texture2D(uDayTexture, vUv).rgb;
      vec3 nightColor = texture2D(uNightTexture, vUv).rgb;
      vec3 paleoColor = texture2D(uPaleoTexture, vUv).rgb;

      // Realistic solar diffuse shading on the daytime hemisphere:
      // High noon is brilliant (1.0), softly transitioning toward the twilight terminator (0.65)
      float diffuse = clamp(nDotL * 0.35 + 0.65, 0.65, 1.0);
      vec3 dayBase = dayColor * diffuse;
      vec3 paleoBase = paleoColor * diffuse;
      vec3 dayLit = dayBase;
      vec3 paleoLit = paleoBase;

      // Blend contemporary day texture with paleogeographic texture
      vec3 dayComposite = mix(dayBase, paleoBase, uPaleoFactor);

      // Enhance night city lights and add subtle dark navy ocean depth (#02050b)
      // so the nocturnal hemisphere remains gracefully identifiable against space
      vec3 nightBase = vec3(0.012, 0.022, 0.042);
      vec3 nightComposite = nightColor * 1.4 + nightBase;

      // Mandatory Invariant: Suppression of urban city lights in prehistoric eras (> 0.3 Ma)
      // When uPaleoFactor > 0.0, attenuate artificial city lights to 0.0, leaving only primordial navy night
      vec3 finalNight = mix(nightComposite, vec3(0.012, 0.022, 0.042), uPaleoFactor);

      // Subtle, physically realistic atmospheric terminator glow along the solar terminator
      float sunsetRing = smoothstep(0.0, 0.035, 0.035 - abs(nDotL));
      vec3 sunsetColor = vec3(1.0, 0.52, 0.22) * sunsetRing * 0.12;

      // Composite earth surface
      vec3 surfaceColor = mix(finalNight, dayComposite, dayFactor) + sunsetColor;

      // Fresnel Atmospheric Glow on the silhouette
      float fresnel = pow(1.0 - max(0.0, dot(viewDir, normal)), uAtmospherePower);
      float dayRim = clamp(nDotL * 0.5 + 0.5, 0.25, 1.0);
      vec3 atmosphereGlow = uAtmosphereColor * fresnel * 0.85 * dayRim;

      gl_FragColor = vec4(surfaceColor + atmosphereGlow, 1.0);
    }
  `,
};

export function createEarthMaterial(
  dayTexture?: THREE.Texture | null,
  nightTexture?: THREE.Texture | null,
  paleoTexture?: THREE.Texture | null
): THREE.ShaderMaterial {
  const uniforms = THREE.UniformsUtils.clone(EarthShader.uniforms);
  if (dayTexture) uniforms.uDayTexture.value = dayTexture;
  if (nightTexture) uniforms.uNightTexture.value = nightTexture;
  if (paleoTexture) {
    uniforms.uPaleoTexture.value = paleoTexture;
  } else if (!uniforms.uPaleoTexture.value) {
    uniforms.uPaleoTexture.value = createPlaceholderTexture(15, 30, 45);
  }

  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader: EarthShader.vertexShader,
    fragmentShader: EarthShader.fragmentShader,
    transparent: false,
    depthWrite: true,
  });
}
