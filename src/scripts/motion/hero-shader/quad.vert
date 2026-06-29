#version 300 es
// Full-screen-triangle pass-through (no attributes, no buffers).
// Emits 3 vertices that cover the whole clip space; gl.drawArrays(TRIANGLES, 0, 3).
// Derives clip coords from gl_VertexID so the runtime uploads no geometry.
//
//   id 0 -> (-1,-1)   id 1 -> ( 3,-1)   id 2 -> (-1, 3)
//
// v_uv runs 0..1 across the covered viewport for the fragment shader.

out vec2 v_uv;

void main() {
  vec2 pos = vec2(
    float((gl_VertexID & 1) << 2) - 1.0,
    float((gl_VertexID & 2) << 1) - 1.0
  );
  v_uv = pos * 0.5 + 0.5;
  gl_Position = vec4(pos, 0.0, 1.0);
}
