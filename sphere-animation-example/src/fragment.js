export default `
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
