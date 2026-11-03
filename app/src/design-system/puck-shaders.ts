export const puckBackdropVertex = `
attribute vec2 aPosition;
varying vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

export const puckBackdropFragment = `
precision highp float;
varying vec2 vUv;
uniform float uDark;
void main() {
  vec3 canvas = mix(vec3(0.949, 0.949, 0.914), vec3(0.03137, 0.03922, 0.05098), uDark);
  vec3 ink = mix(vec3(0.80, 0.83, 0.80), vec3(0.10588, 0.13333, 0.17255), uDark);
  vec2 cell = abs(fract((vUv - 0.5) * 10.0 + 0.5) - 0.5);
  float grid = 1.0 - smoothstep(0.008, 0.022, min(cell.x, cell.y));
  vec3 color = mix(canvas, ink, grid);
  gl_FragColor = vec4(color, 1.0);
}
`;

export const puckVertex = `
attribute vec3 aPosition;
attribute vec3 aNormal;
uniform mat4 uModel;
uniform mat4 uProjection;
varying vec3 vNormal;
varying vec3 vEye;
varying vec3 vPosition;
void main() {
  vec4 world = uModel * vec4(aPosition, 1.0);
  vNormal = normalize((uModel * vec4(aNormal, 0.0)).xyz);
  vEye = normalize(world.xyz - vec3(0.0, 0.0, 3.6));
  vPosition = aPosition;
  gl_Position = uProjection * vec4(world.xyz - vec3(0.0, 0.0, 3.6), 1.0);
}
`;

export const puckFragment = `
precision highp float;
uniform sampler2D uScene;
uniform vec2 uResolution;
uniform float uDark;
varying vec3 vNormal;
varying vec3 vEye;
varying vec3 vPosition;
vec3 sampleSpectrum(vec2 uv, vec3 eye, vec3 normal, float slide) {
  vec2 r = refract(eye, normal, 1.0 / 1.13).xy;
  vec2 y = refract(eye, normal, 1.0 / 1.17).xy;
  vec2 g = refract(eye, normal, 1.0 / 1.21).xy;
  vec2 c = refract(eye, normal, 1.0 / 1.25).xy;
  vec2 b = refract(eye, normal, 1.0 / 1.29).xy;
  vec2 v = refract(eye, normal, 1.0 / 1.33).xy;
  float travel = 0.23 + slide;
  vec3 red = texture2D(uScene, clamp(uv + r * travel, 0.001, 0.999)).rgb;
  vec3 yellow = texture2D(uScene, clamp(uv + y * travel, 0.001, 0.999)).rgb;
  vec3 green = texture2D(uScene, clamp(uv + g * travel, 0.001, 0.999)).rgb;
  vec3 cyan = texture2D(uScene, clamp(uv + c * travel, 0.001, 0.999)).rgb;
  vec3 blue = texture2D(uScene, clamp(uv + b * travel, 0.001, 0.999)).rgb;
  vec3 violet = texture2D(uScene, clamp(uv + v * travel, 0.001, 0.999)).rgb;
  float R = red.r * 0.5;
  float Y = (yellow.r * 2.0 + yellow.g * 2.0 - yellow.b) / 6.0;
  float G = green.g * 0.5;
  float C = (cyan.g * 2.0 + cyan.b * 2.0 - cyan.r) / 6.0;
  float B = blue.b * 0.5;
  float V = (violet.b * 2.0 + violet.r * 2.0 - violet.g) / 6.0;
  return vec3(R + (2.0 * V + 2.0 * Y - C) / 3.0, G + (2.0 * Y + 2.0 * C - V) / 3.0, B + (2.0 * C + 2.0 * V - Y) / 3.0);
}
vec3 studio(vec3 direction) {
  float strip = exp(-pow((direction.x + direction.y * 0.35 - 0.22) / 0.20, 2.0));
  float softbox = pow(max(dot(direction, normalize(vec3(-0.6, 0.85, 0.7))), 0.0), 8.0);
  float rim = pow(max(dot(direction, normalize(vec3(0.7, -0.1, 0.75))), 0.0), 12.0);
  vec3 ambient = mix(vec3(0.24, 0.44, 0.50), vec3(0.46, 0.30, 0.56), direction.x * 0.5 + 0.5);
  return ambient + vec3(0.32, 0.78, 0.88) * strip * 0.85 + vec3(0.92, 0.64, 0.46) * softbox * 0.65 + vec3(0.56, 0.40, 0.92) * rim * 0.90;
}
void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec3 eye = normalize(vEye);
  vec3 normal = normalize(gl_FrontFacing ? vNormal : -vNormal);
  vec3 color = vec3(0.0);
  for (int tap = 0; tap < 4; tap++) color += sampleSpectrum(uv, eye, normal, float(tap) * 0.008);
  color *= 0.25;
  float gray = dot(color, vec3(0.2126, 0.7152, 0.0722));
  color = mix(vec3(gray), color, 1.80);
  float fresnel = pow(1.0 - abs(dot(-eye, normal)), 4.0);
  vec3 reflection = studio(reflect(eye, normal));
  color = mix(color, reflection, 0.04 + fresnel * 0.58);
  vec3 light = normalize(vec3(-0.5, 1.0, 1.2));
  float specular = pow(max(dot(normal, normalize(light - eye)), 0.0), 32.0);
  color += vec3(0.95, 0.99, 1.0) * specular * 0.065;
  float edge = smoothstep(0.82, 0.94, length(vPosition.xz));
  vec3 prism = 0.5 + 0.5 * cos(6.283185 * (dot(normal, vec3(0.48, 0.30, 0.18)) + vec3(0.0, 0.33, 0.67)));
  color += prism * fresnel * (0.18 + edge * 0.08);
  if (gl_FrontFacing) color = pow(1.0 - exp(-max(color, vec3(0.0)) * 1.30), vec3(0.72));
  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`;

export const puckCopyFragment = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uScene;
void main() { gl_FragColor = texture2D(uScene, vUv); }
`;
