// Remap value from [inMin, inMax] to [outMin, outMax]
float remap(float value, float inMin, float inMax, float outMin, float outMax) {
  return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
}

// Alias: map (same as remap, shorter name)
float map(float value, float inMin, float inMax, float outMin, float outMax) {
  return remap(value, inMin, inMax, outMin, outMax);
}

// Rotate a 2D vector by angle (radians)
mat2 rotate2D(float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return mat2(c, -s, s, c);
}

// Smooth cubic ease-in-out (Ken Perlin)
float smootherstep(float edge0, float edge1, float x) {
  x = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
  return x * x * x * (x * (x * 6.0 - 15.0) + 10.0);
}

// Ease-in quadratic
float easeInQuad(float t) {
  return t * t;
}

// Ease-out quadratic
float easeOutQuad(float t) {
  return t * (2.0 - t);
}

// Ease-in-out quadratic
float easeInOutQuad(float t) {
  return t < 0.5 ? 2.0 * t * t : -1.0 + (4.0 - 2.0 * t) * t;
}
