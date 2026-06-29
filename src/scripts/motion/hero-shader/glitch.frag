#version 300 es
precision highp float;

/*
 * Hero glitch field (FX-03 / D-01..D-04).
 *
 * A navy/black base field (u_navy) with a MINORITY red bleed (u_red / u_redGlow),
 * layering four effects so red never floods (D-02):
 *   1. film-grain noise, LOWER amplitude than a second full grain (Pitfall 6 —
 *      the global body::after grain still paints on top)
 *   2. RGB-channel-split chromatic aberration (red fringe from the brand red)
 *   3. periodic digital glitch bursts (block/scanline displacement) keyed off u_time
 *   4. a mouse-reactive warp toward u_mouse (throttled/ambient by the runtime)
 *
 * Brand colors arrive as uniforms from tokens.css — NO hard-coded brand hex here.
 */

in vec2 v_uv;
out vec4 fragColor;

uniform float u_time;        // seconds
uniform vec2  u_resolution;  // device px
uniform vec2  u_mouse;       // 0..1 normalized; (0.5,0.5) = ambient/centered
uniform vec3  u_navy;        // --navy   base field
uniform vec3  u_red;         // --red    bleed
uniform vec3  u_redGlow;     // --red-glow burst glow

// --- hash / noise helpers ---------------------------------------------------
float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

void main() {
  // Aspect-correct coords centered at 0; uv stays 0..1 for sampling.
  vec2 uv = v_uv;
  vec2 aspect = vec2(u_resolution.x / max(u_resolution.y, 1.0), 1.0);
  vec2 cen = (uv - 0.5) * aspect;

  // --- mouse / ambient warp (4) ---------------------------------------------
  // u_mouse defaults to (0.5,0.5); the runtime drifts it on touch so the field
  // breathes even with no pointer (D-22 ambient).
  vec2 m = (u_mouse - 0.5) * aspect;
  float md = distance(cen, m);
  float pull = 0.012 / (md * md + 0.04);       // soft falloff toward the cursor
  vec2 warp = normalize(cen - m + 1e-4) * pull;
  uv -= warp;

  // --- glitch bursts (3) -----------------------------------------------------
  // Bursts gate on a slow noise track so the field is calm most of the time and
  // jolts occasionally (digital displacement + scanline tear).
  float burstSeed = vnoise(vec2(u_time * 1.7, 11.0));
  float burst = smoothstep(0.72, 0.96, burstSeed);
  float line = floor(uv.y * 90.0);
  float jitter = (hash21(vec2(line, floor(u_time * 24.0))) - 0.5);
  float blockShift = jitter * 0.06 * burst;
  uv.x += blockShift;
  // thin scanline darkening that intensifies during a burst
  float scan = 0.04 * burst * step(0.5, fract(uv.y * 220.0 + u_time * 2.0));

  // --- chromatic aberration (2) ---------------------------------------------
  // Channel split grows with radius and with the active burst — the RED fringe
  // is what carries the brand bleed (D-01/D-02).
  float ca = (0.0025 + 0.012 * burst) * (0.4 + length(cen));
  vec2 dir = normalize(cen + 1e-4);
  float rN = vnoise(uv * 3.0 + u_time * 0.05 + dir * ca);
  float gN = vnoise(uv * 3.0 + u_time * 0.05);
  float bN = vnoise(uv * 3.0 + u_time * 0.05 - dir * ca);

  // --- film grain (1), LOW amplitude (Pitfall 6) ----------------------------
  float grain = hash21(uv * u_resolution.xy * 0.5 + fract(u_time) * 91.7);
  float grainAmt = 0.05;

  // --- compose: navy base, red as a minority accent -------------------------
  // Base luminance field from the noise channels (cool, dim).
  float base = mix(gN, bN, 0.5) * 0.22;
  vec3 col = u_navy + base * 0.5;

  // Red bleed: only where the red-shifted channel leads, kept minority via the
  // 0.18 ceiling; the glow rides the active burst.
  float redLead = clamp(rN - gN, 0.0, 1.0);
  col += u_red * redLead * 0.18;
  col += u_redGlow * burst * smoothstep(0.4, 0.0, md) * 0.12;

  // grain + scanline
  col += (grain - 0.5) * grainAmt;
  col -= scan;

  // Vignette so the GLSL field itself helps legibility before the CSS overlay.
  float vig = smoothstep(1.15, 0.25, length(cen));
  col *= 0.55 + 0.45 * vig;

  fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
