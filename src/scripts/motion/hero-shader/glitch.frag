#version 300 es
precision highp float;

/*
 * Hero glitch field (FX-03 / D-01..D-04) — "constant malfunction" rework.
 *
 * A navy/black base field (u_navy) with a MINORITY red bleed (u_red / u_redGlow).
 * INVERTED behavior (user feedback 02.1-02): the field is in a PERSISTENT low-level
 * malfunction by default — always-present grain, chromatic aberration and signal
 * instability — and PERIODICALLY (randomized intervals) everything SNAPS into clean
 * clarity for a moment before degrading back. A "clarity" factor in [0..1] drives
 * this: clarity≈1 => clean/stable, clarity≈0 => full malfunction.
 *
 * Lights (D / user feedback): the pointer light (u_mouse) plus TWO autonomous roaming
 * glow points that wander on slow Lissajous paths driven by u_time (no extra JS /
 * uniforms — GPU-cheap). All three share the same warp+glow look; the roamers are
 * smaller. Legibility is guaranteed by the persistent malfunction staying subtle and
 * by the CSS .hero-shader-overlay scrim above this field (AA holds even mid-glitch).
 * Under prefers-reduced-motion the shader never runs (static fallback => clean/stable).
 *
 * Brand colors arrive as uniforms from theme.css — NO hard-coded brand hex here.
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

// A soft warp + reddish glow contribution from a single light point `p` (aspect
// space). `strength` scales the pull, `glow` scales the additive red glow, both so
// the roaming lights can be smaller than the pointer light. `radius` sets how far
// the glow reaches — small radii read as tight SEARCHLIGHT beams cutting the dark.
void lightPoint(in vec2 cen, in vec2 p, in float strength, in float glow,
                in float radius, inout vec2 uv, inout float glowAccum, in vec2 aspect) {
  float d = distance(cen, p);
  float pull = strength / (d * d + 0.04);
  uv -= normalize(cen - p + 1e-4) * pull;
  // Tight bright core with a quick falloff so darkness dominates between the beams.
  glowAccum += glow * pow(smoothstep(radius, 0.0, d), 1.8);
}

void main() {
  // Aspect-correct coords centered at 0; uv stays 0..1 for sampling.
  vec2 uv = v_uv;
  vec2 aspect = vec2(u_resolution.x / max(u_resolution.y, 1.0), 1.0);
  vec2 cen = (uv - 0.5) * aspect;

  // --- CLARITY cycle: persistent malfunction, periodic snap-to-clean ---------
  // A slow noise track triggers brief clarity windows at irregular intervals. When
  // clarity≈1 the malfunction (grain/aberration/jitter/scanline) is suppressed; the
  // default (clarity≈0) is the constant low-level malfunction state.
  float claritySeed = vnoise(vec2(u_time * 0.55, 3.0));
  float clarity = smoothstep(0.62, 0.92, claritySeed);
  // The amount of malfunction currently applied (never fully zero so the field still
  // has texture even when "clean", but heavily reduced during a clarity window).
  float malf = mix(1.0, 0.12, clarity);

  // --- lights: pointer + FOUR autonomous roaming searchlights ----------------
  // Darkness dominates; the moving lights cut through it like searchlights. Glow
  // levels are intentionally low and the cores tight (small radii) so the field
  // reads dark between the beams (user feedback: "luces de búsqueda en la oscuridad").
  vec2 m = (u_mouse - 0.5) * aspect;
  float glowAccum = 0.0;
  // Pointer light — tightened so it no longer floods the field.
  lightPoint(cen, m, 0.010, 0.10, 0.42, uv, glowAccum, aspect);
  // Roamer 1..4 — varied speeds / phases / path sizes so they wander organically and
  // never lock together. Smaller than the pointer light.
  vec2 l1 = vec2(cos(u_time * 0.17 + 0.0), sin(u_time * 0.13 + 1.7)) * vec2(0.66, 0.44) * aspect;
  lightPoint(cen, l1, 0.0050, 0.060, 0.34, uv, glowAccum, aspect);
  vec2 l2 = vec2(cos(u_time * 0.11 + 2.6), sin(u_time * 0.19 + 4.1)) * vec2(0.54, 0.56) * aspect;
  lightPoint(cen, l2, 0.0045, 0.055, 0.30, uv, glowAccum, aspect);
  vec2 l3 = vec2(cos(u_time * 0.23 + 5.0), sin(u_time * 0.09 + 0.6)) * vec2(0.70, 0.36) * aspect;
  lightPoint(cen, l3, 0.0040, 0.050, 0.28, uv, glowAccum, aspect);
  vec2 l4 = vec2(cos(u_time * 0.08 + 3.3), sin(u_time * 0.15 + 2.2)) * vec2(0.46, 0.60) * aspect;
  lightPoint(cen, l4, 0.0042, 0.052, 0.32, uv, glowAccum, aspect);

  // --- signal instability (persistent, scaled by malf) -----------------------
  // Constant block/scanline displacement + occasional harder tear spikes. Even when
  // "clean" a faint amount remains (malf floor) so it reads as a fragile signal.
  float tearSpike = smoothstep(0.80, 0.97, vnoise(vec2(u_time * 2.3, 19.0)));
  float instability = malf * (0.35 + tearSpike);
  float line = floor(uv.y * 90.0);
  float jitter = (hash21(vec2(line, floor(u_time * 26.0))) - 0.5);
  uv.x += jitter * 0.05 * instability;
  // thin rolling scanline darkening, always faintly present, stronger mid-malfunction
  float scan = (0.018 + 0.05 * tearSpike) * malf
             * step(0.5, fract(uv.y * 220.0 + u_time * 2.0));

  // --- chromatic aberration (persistent, scaled by malf) ---------------------
  // RGB channel split: a constant baseline aberration (so it's always slightly
  // broken) growing with radius and with active tears. Suppressed during clarity.
  float ca = (0.0016 + 0.011 * instability) * (0.45 + length(cen));
  vec2 dir = normalize(cen + 1e-4);
  float rN = vnoise(uv * 3.0 + u_time * 0.05 + dir * ca);
  float gN = vnoise(uv * 3.0 + u_time * 0.05);
  float bN = vnoise(uv * 3.0 + u_time * 0.05 - dir * ca);

  // --- film grain (persistent, scaled by malf) -------------------------------
  float grain = hash21(uv * u_resolution.xy * 0.5 + fract(u_time) * 91.7);
  float grainAmt = mix(0.02, 0.075, malf);

  // --- compose: DARK navy base, red as a minority accent --------------------
  // The ambient field is dialled down so darkness dominates and the searchlights
  // read as light cutting through it (user feedback: darker/moodier hero).
  float base = mix(gN, bN, 0.5) * 0.14;
  vec3 col = u_navy * 0.82 + base * 0.32;

  // Red bleed: only where the red-shifted channel leads, kept minority.
  float redLead = clamp(rN - gN, 0.0, 1.0);
  col += u_red * redLead * 0.18;
  // Light glow (red-glow) from the pointer + roamers; rides a touch higher during a
  // tear so the malfunction flares red, but stays a minority accent.
  col += u_redGlow * glowAccum * (0.85 + 0.6 * tearSpike * malf);

  // grain + scanline
  col += (grain - 0.5) * grainAmt;
  col -= scan;

  // Vignette so the GLSL field itself helps legibility before the CSS overlay.
  float vig = smoothstep(1.15, 0.25, length(cen));
  col *= 0.55 + 0.45 * vig;

  fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
