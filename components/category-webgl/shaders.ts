export const RIPPLE_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

export const RIPPLE_FRAG = /* glsl */ `
varying vec2 vUv;
uniform sampler2D t0;
uniform sampler2D t1;
uniform sampler2D t2;
uniform vec2 uMouse;
uniform vec2 uRes;
uniform float uTime;
uniform float uAmp;

vec4 sampleCover(sampler2D tex, vec2 uv) {
  vec2 p = (uv - 0.5) * 0.88 + 0.5;
  p = clamp(p, 0.002, 0.998);
  return texture2D(tex, p);
}

vec4 mosaicAt(vec2 uv) {
  float gap = 0.01;
  float col = (1.0 - gap * 2.0) / 3.0;
  float x = uv.x;
  vec4 ink = vec4(0.05, 0.05, 0.07, 1.0);

  if (x < col) {
    return sampleCover(t0, vec2(x / col, uv.y));
  }
  if (x < col + gap) return ink;
  if (x < col * 2.0 + gap) {
    return sampleCover(t1, vec2((x - col - gap) / col, uv.y));
  }
  if (x < col * 2.0 + gap * 2.0) return ink;
  return sampleCover(t2, vec2((x - col * 2.0 - gap * 2.0) / col, uv.y));
}

void main() {
  vec2 uv = vUv;
  vec2 aspect = vec2(uRes.x / max(uRes.y, 1.0), 1.0);
  vec2 m = uMouse;
  float d = length((uv - m) * aspect);
  vec2 dir = normalize(uv - m + 0.0001);
  float wave = sin(d * 32.0 - uTime * 4.6);
  float env = exp(-d * 5.2) * uAmp;
  vec2 disp = dir * wave * env * 0.05;

  vec4 cr = mosaicAt(uv + disp * 1.12);
  vec4 cg = mosaicAt(uv + disp);
  vec4 cb = mosaicAt(uv + disp * 0.88);
  vec4 color = vec4(cr.r, cg.g, cb.b, 1.0);

  float spec = pow(1.0 - smoothstep(0.0, 0.28, d), 2.2) * 0.18 * uAmp;
  color.rgb += spec;
  color.rgb *= mix(1.0, 0.86 + 0.14 * smoothstep(1.1, 0.15, d), uAmp);
  gl_FragColor = color;
}
`
