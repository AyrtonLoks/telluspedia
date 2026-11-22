/**
 * Shaders GLSL do cometa Halley (núcleo, plumas de íons e de poeira). Separados do componente na T36.
 * Normais em espaço mundial (AGENTS.md §1).
 */
/**
 * World-space solar-lit carbonaceous & icy-vent shader for Halley's sculpted nucleus.
 * Strictly respects AGENTS.md §1 GLSL World-Space Normal Invariant.
 */
export const halleyNucleusVertexShader = `
attribute vec3 aTerrain;

varying vec3 vWorldNormal;
varying vec3 vWorldPos;
varying vec3 vLocalPos;
varying vec3 vTerrain;

void main() {
  vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPos = worldPos.xyz;
  vLocalPos = position;
  vTerrain = aTerrain;
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

export const halleyNucleusFragmentShader = `
uniform float uActivity;

varying vec3 vWorldNormal;
varying vec3 vWorldPos;
varying vec3 vLocalPos;
varying vec3 vTerrain;

float hash31(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}

float vnoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);

  return mix(
    mix(
      mix(hash31(i + vec3(0.0, 0.0, 0.0)), hash31(i + vec3(1.0, 0.0, 0.0)), f.x),
      mix(hash31(i + vec3(0.0, 1.0, 0.0)), hash31(i + vec3(1.0, 1.0, 0.0)), f.x),
      f.y
    ),
    mix(
      mix(hash31(i + vec3(0.0, 0.0, 1.0)), hash31(i + vec3(1.0, 0.0, 1.0)), f.x),
      mix(hash31(i + vec3(0.0, 1.0, 1.0)), hash31(i + vec3(1.0, 1.0, 1.0)), f.x),
      f.y
    ),
    f.z
  );
}

void main() {
  vec3 baseN = normalize(vWorldNormal);
  vec3 sunDir = normalize(-vWorldPos);
  vec3 viewDir = normalize(cameraPosition - vWorldPos);

  // Analytical 3D micro-relief gradient for crisp rocky detail up close (no derivatives extension required)
  vec3 p = vLocalPos * 42.0;
  float eps = 0.08;
  float n0 = vnoise(p) * 0.65 + vnoise(p * 2.3) * 0.35;
  float nx = vnoise(p + vec3(eps, 0.0, 0.0)) * 0.65 + vnoise((p + vec3(eps, 0.0, 0.0)) * 2.3) * 0.35;
  float ny = vnoise(p + vec3(0.0, eps, 0.0)) * 0.65 + vnoise((p + vec3(0.0, eps, 0.0)) * 2.3) * 0.35;
  float nz = vnoise(p + vec3(0.0, 0.0, eps)) * 0.65 + vnoise((p + vec3(0.0, 0.0, eps)) * 2.3) * 0.35;
  vec3 grad = vec3(nx - n0, ny - n0, nz - n0) / eps;
  vec3 N = normalize(baseN - grad * 0.28);

  float ndotl = dot(N, sunDir);
  float diffuse = max(0.0, ndotl);
  float softTerminator = smoothstep(-0.18, 0.45, ndotl);

  // Carbonaceous dark crust with dusty ridges and icy blue-white fissures
  float ridge = vTerrain.x;
  float ao = vTerrain.y;
  float iceVent = vTerrain.z;

  vec3 darkCrust = vec3(0.09, 0.10, 0.13);
  vec3 dustRidge = vec3(0.32, 0.31, 0.33);
  vec3 iceColor = vec3(0.70, 0.88, 0.98);

  vec3 albedo = mix(darkCrust, dustRidge, clamp(ridge * 0.75 + n0 * 0.35, 0.0, 1.0));
  albedo = mix(albedo, iceColor, iceVent * 0.55);
  albedo *= ao;

  // Specular glint on exposed ice patches facing sunlight
  vec3 halfVec = normalize(sunDir + viewDir);
  float spec = pow(max(0.0, dot(N, halfVec)), 28.0) * (0.08 + iceVent * 0.55) * diffuse;

  // Cool starlight ambient fill + icy Fresnel silhouette rim so night side stays sculptural
  float fresnel = pow(1.0 - max(0.0, dot(baseN, viewDir)), 2.8);
  vec3 rimColor = mix(vec3(0.28, 0.42, 0.58), vec3(0.45, 0.85, 1.0), uActivity);

  vec3 color = albedo * (0.14 + diffuse * 1.45) + vec3(0.85, 0.94, 1.0) * spec;
  color += rimColor * fresnel * (0.32 + uActivity * 0.45);

  // Active sunlit sublimation vents erupting near perihelion
  color += vec3(0.50, 0.90, 1.0) * iceVent * softTerminator * uActivity * 0.85;

  gl_FragColor = vec4(color, 1.0);
}
`;

/**
 * Volumetric additive ion (plasma) plume shader — straight anti-solar streamers with soft Fresnel edge falloff.
 */
export const ionPlumeVertexShader = `
varying vec2 vUv;
varying vec3 vWorldNormal;
varying vec3 vWorldPos;

void main() {
  vUv = uv;
  vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPos = worldPos.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

export const ionPlumeFragmentShader = `
uniform float uTime;
uniform float uOpacity;

varying vec2 vUv;
varying vec3 vWorldNormal;
varying vec3 vWorldPos;

void main() {
  vec3 viewDir = normalize(cameraPosition - vWorldPos);
  // Soft volumetric edge falloff eliminates hard tube silhouettes from every camera angle
  float edgeSoft = pow(abs(dot(normalize(vWorldNormal), viewDir)), 1.45);
  float alongFade = smoothstep(0.0, 0.09, vUv.y) * pow(max(0.0, 1.0 - vUv.y), 1.4);

  // Animated solar-wind plasma striations flowing away from the Sun
  float streak1 = 0.65 + 0.35 * sin(vUv.x * 25.1327 + vUv.y * 5.0 - uTime * 3.0);
  float streak2 = 0.75 + 0.25 * cos(vUv.x * 12.5664 - vUv.y * 9.0 + uTime * 2.1);
  float filament = streak1 * streak2;

  vec3 coreColor = vec3(0.82, 0.97, 1.0);
  vec3 midColor = vec3(0.22, 0.72, 0.98);
  vec3 tipColor = vec3(0.14, 0.36, 0.92);
  vec3 col = mix(coreColor, midColor, smoothstep(0.0, 0.35, vUv.y));
  col = mix(col, tipColor, smoothstep(0.35, 1.0, vUv.y));

  float alpha = edgeSoft * alongFade * filament * uOpacity * 0.72;
  gl_FragColor = vec4(col * alpha, alpha);
}
`;

/**
 * Volumetric additive curved dust plume shader — broad warm solar-lit fan with silky edge falloff.
 */
export const dustPlumeVertexShader = `
varying vec2 vUv;
varying vec3 vWorldNormal;
varying vec3 vWorldPos;

void main() {
  vUv = uv;
  vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPos = worldPos.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

export const dustPlumeFragmentShader = `
uniform float uOpacity;

varying vec2 vUv;
varying vec3 vWorldNormal;
varying vec3 vWorldPos;

void main() {
  vec3 viewDir = normalize(cameraPosition - vWorldPos);
  float edgeSoft = pow(abs(dot(normalize(vWorldNormal), viewDir)), 1.65);
  float alongFade = smoothstep(0.0, 0.11, vUv.y) * pow(max(0.0, 1.0 - vUv.y), 1.3);
  float band = 0.82 + 0.18 * sin(vUv.x * 12.5664 + vUv.y * 2.5);

  vec3 coreColor = vec3(1.0, 0.95, 0.80);
  vec3 midColor = vec3(0.98, 0.78, 0.44);
  vec3 tipColor = vec3(0.84, 0.54, 0.22);
  vec3 col = mix(coreColor, midColor, smoothstep(0.0, 0.42, vUv.y));
  col = mix(col, tipColor, smoothstep(0.42, 1.0, vUv.y));

  float alpha = edgeSoft * alongFade * band * uOpacity * 0.58;
  gl_FragColor = vec4(col * alpha, alpha);
}
`;
