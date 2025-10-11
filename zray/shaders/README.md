# Shader Documentation

This directory contains GLSL shaders that create the organic, visually appealing effects in Flappy Zig.

## Overview

The game uses custom fragment and vertex shaders to achieve:
- Organic, blob-like character appearance
- Smooth trail effects with particles
- Animated eyes with blinking
- Procedural noise for natural-looking shapes
- Dynamic deformation based on velocity

## Shader Files

### Organic Character Shader

**Files:**
- `organic.vert` - Vertex shader (pass-through)
- `organic.frag` - Fragment shader (main visual effects)

**Purpose:** Creates the player character's appearance with procedural effects.

**Key Features:**
1. **Fractional Brownian Motion (FBM)** - Organic shape generation
2. **Trail Rendering** - Motion trail with age-based fading
3. **Velocity-based Deformation** - Squash and stretch effects
4. **Animated Eyes** - Blinking and pupil movement
5. **Glow Effects** - Ambient lighting around character

**Uniforms:**
```glsl
uniform float u_time;              // Animation time
uniform vec2 u_center;             // Ball center position
uniform float u_radius;            // Ball radius
uniform vec2 u_velocity;           // Ball velocity (for deformation)
uniform vec2 u_trail_points[20];   // Trail particle positions
uniform int u_trail_count;         // Number of active trail points
uniform vec2 u_eye_target;         // Eye look direction (unused)
```

### Pipe Shader

**Files:**
- `pipe_organic.vert` - Vertex shader
- `pipe_organic.frag` - Fragment shader

**Purpose:** Renders pipe obstacles with organic styling to match the game aesthetic.

### Background Shader

**Files:**
- `background.vert` - Vertex shader
- `background.frag` - Fragment shader

**Purpose:** Creates the scrolling background with procedural effects.

## Shader Techniques

### 1. Procedural Noise

Simple noise function for randomization:

```glsl
float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    
    // Generate pseudo-random values at grid points
    float a = fract(sin(dot(i, vec2(12.9898, 78.233))) * 43758.5453);
    // ... (b, c, d similar)
    
    // Smooth interpolation
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}
```

### 2. Fractional Brownian Motion (FBM)

Layered noise for organic shapes:

```glsl
float fbm(vec2 st) {
    float value = 0.0;
    float amplitude = 0.5;
    
    // Octaves: each iteration adds finer detail
    for (int i = 0; i < 3; i++) {
        value += amplitude * noise(st);
        st *= 2.0;        // Double frequency
        amplitude *= 0.5;  // Half amplitude
    }
    return value;
}
```

**How it works:**
- Start with base noise
- Add smaller, higher-frequency variations
- Creates natural-looking organic patterns

### 3. Distance Fields

Used for smooth edges and anti-aliasing:

```glsl
float dist = length(uv - center);
float alpha = smoothstep(radius + edge, radius - edge, dist);
```

**Benefits:**
- Smooth, anti-aliased edges
- No texture sampling required
- Easy to animate and deform

### 4. Trail Rendering

Age-based particle system:

```glsl
for (int i = 0; i < 20; i++) {
    if (i >= u_trail_count) break;
    
    vec2 trail_point = u_trail_points[i];
    float trail_age = float(i) / max(float(u_trail_count), 1.0);
    
    // Older points are smaller and more transparent
    float size_falloff = pow(trail_age, 0.1);
    float alpha_falloff = pow(trail_age, 0.9);
    
    float trail_radius = u_radius * (1.0 - size_falloff * 0.7);
    float trail_alpha = (1.0 - alpha_falloff) * 0.7;
    
    // Render trail point with additive blending
    // ...
}
```

### 5. Velocity-based Deformation

Creates squash and stretch effect:

```glsl
// Calculate direction of movement
vec2 vel_normalized = normalize(u_velocity);
vec2 dir = normalize(from_center);

// How aligned is this point with movement direction?
float directional_alignment = dot(dir, -vel_normalized);

// Deform based on alignment (limited to prevent artifacts)
float deformation = 1.0 + clamp(
    directional_alignment * vel_magnitude,
    -0.15,  // Max squash
    0.15    // Max stretch
);

// Apply deformation to distance calculation
float deformed_dist = dist / deformation;
```

### 6. Eye Animation

Procedural blinking cycle:

```glsl
// Sine wave creates smooth blink cycle
float blink_cycle = sin(u_time * 0.7) * 0.5 + 0.5;

// Sharp transition creates blink
float blink = smoothstep(0.95, 1.0, blink_cycle);

// Draw eyelid
if (blink > 0.0) {
    float eyelid_y = mix(-eye_radius * 0.8, eye_radius * 0.6, blink);
    if (from_eye.y > eyelid_y) {
        eye_alpha *= (1.0 - blink);
    }
}
```

## Coordinate Systems

**Important:** GLSL uses bottom-left origin, while Raylib uses top-left.

```
Raylib (CPU):           GLSL (GPU):
┌──────────┐           ┌──────────┐
│(0,0)     │           │      (w,h)│
│          │           │          │
│     (x,y)│           │(x,y)     │
│          │           │          │
│     (w,h)│           │(0,0)     │
└──────────┘           └──────────┘
```

**Conversion in Zig:**
```zig
const shader_y = screen_height - screen_y;
```

## Performance Considerations

1. **Minimize branching** - Use smoothstep instead of if/else where possible
2. **Avoid expensive operations** - sqrt, pow, etc. Use squared distances
3. **Early exit** - Discard fragments outside main blob early
4. **Loop unrolling** - Small, fixed-size loops are optimized by compiler

## Modifying Shaders

### Change Colors

In `organic.frag`, find the color definitions:

```glsl
// Main blob colors
vec3 blob_base = vec3(0.4, 0.9, 1.0);      // Cyan-blue
vec3 blob_highlight = vec3(0.6, 1.1, 1.2);  // Bright cyan

// Trail colors
vec3 trail_base = vec3(0.3, 0.8, 0.9);
vec3 trail_accent = vec3(0.8, 0.9, 2);
```

### Adjust Animation Speed

```glsl
// Faster wobble
float wobble = sin(u_time * 5.0 + ...) * 0.04;  // Was 2.5

// Faster blinking
float blink_cycle = sin(u_time * 1.4) * 0.5 + 0.5;  // Was 0.7
```

### More/Less Trail

Modify trail length by changing array size in both shader and Zig code:

**In shader:**
```glsl
uniform vec2 u_trail_points[20];  // Change size here
```

**In ball.zig:**
```zig
trail: struct {
    points: [20]rl.Vector2 = ...,  // Match shader size
    ages: [20]f32 = ...,
    // ...
}
```

## Debugging Shaders

### Visualize Values

Output debug colors:

```glsl
// Visualize distance field
finalColor = vec4(dist / u_radius, 0.0, 0.0, 1.0);

// Visualize noise
float n = fbm(uv * 0.01);
finalColor = vec4(n, n, n, 1.0);

// Visualize velocity
finalColor = vec4(abs(u_velocity.x) * 0.01, abs(u_velocity.y) * 0.01, 0.0, 1.0);
```

### Common Issues

1. **Black screen** - Check if shader compiles (errors in console)
2. **Wrong position** - Remember Y-axis flip between CPU and GPU
3. **Flickering** - Ensure consistent alpha calculation
4. **Performance issues** - Reduce loop iterations or simplify calculations

## Learning Resources

- [The Book of Shaders](https://thebookofshaders.com/) - Interactive GLSL guide
- [Shadertoy](https://www.shadertoy.com/) - Community shader examples
- [Inigo Quilez Articles](https://iquilezles.org/articles/) - Advanced techniques
- [GPU Gems](https://developer.nvidia.com/gpugems/gpugems/contributors) - Shader programming

## Shader Pipeline Flow

```
┌─────────────┐
│  Zig Code   │
│  (CPU)      │
└──────┬──────┘
       │ Set uniforms (position, time, velocity, etc.)
       ▼
┌─────────────┐
│ Vertex      │
│ Shader      │ Transform vertex positions
└──────┬──────┘
       │ Interpolate across triangle
       ▼
┌─────────────┐
│ Fragment    │
│ Shader      │ Calculate color for each pixel
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Framebuffer │ Final image on screen
└─────────────┘
```

---

For questions about shader implementation, see [LEARNING.md](../LEARNING.md) or [ARCHITECTURE.md](../ARCHITECTURE.md).
