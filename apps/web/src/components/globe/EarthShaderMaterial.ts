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
    /** R = elevação em terra, G = água, B = profundidade do oceano (GEBCO 08 via NASA BMNG). */
    uSurfaceTexture: { value: createPlaceholderTexture(0, 0, 0) as THREE.Texture },
    uSurfaceTexel: { value: new THREE.Vector2(1 / 2048, 1 / 1024) },
    /** Intensidade do relevo (0 desliga). */
    uReliefStrength: { value: 1.0 },
    /** Reflexo do Sol nos oceanos (0 desliga). */
    uOceanSpecular: { value: 1.0 },
    /** 1 quando a casca de atmosfera (Atmosphere.tsx) está ligada: o brilho de borda daqui é reduzido. */
    uAtmosphereShell: { value: 1.0 },
    uPaleoFactor: { value: 0.0 },
    uStudyLighting: { value: 0.0 },
    /** Intensidade das luzes urbanas (1 = normal; atenuada com a camada de queimadas — D05). */
    uCityLights: { value: 1.0 },
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
    uniform sampler2D uSurfaceTexture;
    uniform vec2 uSurfaceTexel;
    uniform float uReliefStrength;
    uniform float uOceanSpecular;
    uniform float uAtmosphereShell;
    uniform float uPaleoFactor;
    uniform float uStudyLighting;
    uniform float uCityLights;
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
      float dayFactor = mix(smoothstep(-0.15, 0.15, nDotL), 1.0, uStudyLighting);

      // Sample day, night, and paleogeographic textures
      vec3 dayColor = texture2D(uDayTexture, vUv).rgb;
      vec3 nightColor = texture2D(uNightTexture, vUv).rgb;
      vec4 paleoSample = texture2D(uPaleoTexture, vUv);
      vec3 paleoColor = paleoSample.rgb;

      // Superfície: elevação (R), água (G) e profundidade (B). O relevo por normal vale só para a
      // geografia atual (nos paleomapas ele já vem sombreado); a água do paleomapa vem no alfa.
      vec4 surface = texture2D(uSurfaceTexture, vUv);
      float modern = 1.0 - uPaleoFactor;
      float water = mix(surface.g, paleoSample.a, uPaleoFactor);

      // Relevo: inclina a normal pelo gradiente da elevação (leste/norte no espaço mundial).
      float hE = texture2D(uSurfaceTexture, vUv + vec2(uSurfaceTexel.x, 0.0)).r;
      float hW = texture2D(uSurfaceTexture, vUv - vec2(uSurfaceTexel.x, 0.0)).r;
      float hN = texture2D(uSurfaceTexture, vUv + vec2(0.0, uSurfaceTexel.y)).r;
      float hS = texture2D(uSurfaceTexture, vUv - vec2(0.0, uSurfaceTexel.y)).r;
      vec3 east = normalize(cross(vec3(0.0, 1.0, 0.0), normal) + vec3(1e-5, 0.0, 0.0));
      vec3 north = normalize(cross(normal, east));
      float relief = uReliefStrength * modern * (1.0 - water) * 7.0;
      vec3 reliefNormal = normalize(normal - relief * ((hE - hW) * east + (hN - hS) * north));
      // Sombreamento do relevo relativo à esfera lisa: realça cordilheiras sob luz rasante.
      float reliefShade = clamp((dot(reliefNormal, sunDir) - nDotL) * 2.2, -0.45, 0.45) * (1.0 - uStudyLighting);

      // A textura diurna (Blue Marble com batimetria) já traz plataformas, dorsais e fossas;
      // aqui só um leve ganho de saturação no mar para não apagar sob a luz difusa.
      vec3 baseDay = mix(dayColor, paleoColor, uPaleoFactor);
      vec3 oceanTint = baseDay * vec3(0.94, 1.04, 1.12);
      baseDay = mix(baseDay, oceanTint, water * 0.6);

      // Keep daylight bright at noon and use uniform diffuse lighting in study mode.
      float diffuse = mix(0.78 + max(nDotL, 0.0) * 0.37, 1.15, uStudyLighting);
      vec3 dayComposite = baseDay * diffuse * (1.0 + reliefShade);

      // Reflexo do Sol só na água (Blinn-Phong: brilho concentrado + halo largo).
      vec3 halfDir = normalize(sunDir + viewDir);
      float nDotH = max(dot(normal, halfDir), 0.0);
      float glint = pow(nDotH, 180.0) * 1.1 + pow(nDotH, 18.0) * 0.07;
      vec3 specular = vec3(1.0, 0.94, 0.84) * glint * water * uOceanSpecular
        * smoothstep(0.0, 0.12, nDotL) * (1.0 - uStudyLighting);
      dayComposite += specular;

      // City texture contributes emission over the dark navy of the night side.
      vec3 nightBase = vec3(0.012, 0.022, 0.042);
      vec3 nightComposite = nightColor * 1.05 * uCityLights + nightBase;

      // Mandatory Invariant: Suppression of urban city lights in prehistoric eras (> 0.3 Ma)
      // When uPaleoFactor > 0.0, attenuate artificial city lights to 0.0, leaving only primordial navy night
      vec3 finalNight = mix(nightComposite, vec3(0.012, 0.022, 0.042), uPaleoFactor);

      // Subtle, physically realistic atmospheric terminator glow along the solar terminator
      float sunsetRing = smoothstep(0.0, 0.035, 0.035 - abs(nDotL));
      vec3 sunsetColor = vec3(1.0, 0.52, 0.22) * sunsetRing * 0.055 * (1.0 - uStudyLighting);

      // Composite earth surface
      vec3 surfaceColor = mix(finalNight, dayComposite, dayFactor) + sunsetColor;

      // Fresnel Atmospheric Glow on the silhouette
      float fresnel = pow(1.0 - max(0.0, dot(viewDir, normal)), uAtmospherePower);
      float dayRim = mix(clamp(nDotL * 0.5 + 0.5, 0.15, 1.0), 0.75, uStudyLighting);
      // Com a casca de atmosfera ligada, ela faz o espalhamento; aqui fica só um toque de borda.
      vec3 atmosphereGlow = uAtmosphereColor * fresnel * mix(0.32, 0.1, uAtmosphereShell) * dayRim;

      gl_FragColor = vec4(surfaceColor + atmosphereGlow, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `,
};

export function createEarthMaterial(
  dayTexture?: THREE.Texture | null,
  nightTexture?: THREE.Texture | null,
  paleoTexture?: THREE.Texture | null,
  surfaceTexture?: THREE.Texture | null
): THREE.ShaderMaterial {
  const uniforms = THREE.UniformsUtils.clone(EarthShader.uniforms);
  if (dayTexture) uniforms.uDayTexture.value = dayTexture;
  if (nightTexture) uniforms.uNightTexture.value = nightTexture;
  if (surfaceTexture) uniforms.uSurfaceTexture.value = surfaceTexture;
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
