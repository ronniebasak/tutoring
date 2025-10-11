# Learning Guide: Zig and Game Development

This guide explains the key concepts used in Flappy Zig, making it an excellent resource for learning both the Zig programming language and game development principles.

## Table of Contents

1. [Zig Language Features](#zig-language-features)
2. [Game Development Concepts](#game-development-concepts)
3. [Graphics Programming](#graphics-programming)
4. [Code Walkthroughs](#code-walkthroughs)
5. [Common Patterns](#common-patterns)
6. [Exercises and Challenges](#exercises-and-challenges)

---

## Zig Language Features

### 1. Compile-Time Guarantees

Zig provides powerful compile-time features that catch bugs before runtime:

```zig
// Error handling at compile time
pub fn init(self: *Ball) anyerror!void {
    self.shader = try rl.loadShader("shaders/organic.vert", "shaders/organic.frag");
    // If shader loading fails, error propagates up
}
```

**Key Concepts:**
- `!` - Error union type
- `try` - Propagates errors or unwraps values
- `catch` - Handles errors explicitly

**In Flappy Zig:**
- Resource loading uses error unions
- Explicit error handling prevents crashes
- No hidden exceptions

### 2. Optionals

Zig uses `?T` for optional values instead of null pointers:

```zig
// Scene transitions return optional scene tags
pub fn update(self: *Scene, dt: f32) ?SceneTag {
    // Return null to stay in current scene
    // Return a SceneTag to transition
    if (game_over) {
        return SceneTag.EndScene;  // Transition to end screen
    }
    return null;  // Stay in current scene
}
```

**Pattern Matching:**
```zig
if (ns) |unwrapped_ns| {
    // Use unwrapped_ns here
} else {
    // Handle null case
}
```

### 3. Tagged Unions

Type-safe discriminated unions:

```zig
pub const Scene = union(SceneTag) {
    IntroScene: IntroScene,
    GameScene: GameScene,
    EndScene: EndScene,
};
```

**Benefits:**
- Only one variant active at a time
- Compiler enforces exhaustive matching
- No invalid state possible

**Usage:**
```zig
switch (scene) {
    .IntroScene => |*intro| intro.update(dt),
    .GameScene => |*game| game.update(dt),
    .EndScene => |*end| end.update(dt),
}
```

### 4. Comptime

Compile-time execution for zero-cost abstractions:

```zig
// Array initialization at compile time
trail: struct {
    points: [20]rl.Vector2 = [_]rl.Vector2{rl.Vector2.init(0, 0)} ** 20,
}
```

**Why it matters:**
- No runtime initialization overhead
- Type-safe array sizes
- Generated at compile time

### 5. Explicit Memory Management

No hidden allocations or garbage collection:

```zig
pub fn init(self: *Ball) !void {
    // Explicit resource acquisition
    self.shader = try rl.loadShader(...);
    self.texture = try rl.loadTexture(...);
}

pub fn deinit(self: *Ball) void {
    // Explicit resource cleanup
    rl.unloadShader(self.shader);
    rl.unloadTexture(self.texture);
}
```

**RAII Pattern:**
- Resources acquired in `init()`
- Resources released in `deinit()`
- Caller responsibility to call both

### 6. Defer Statement

Ensures cleanup happens:

```zig
rl.beginDrawing();
defer rl.endDrawing();  // Guaranteed to execute

// Your drawing code here
// Even if error occurs, endDrawing() will be called
```

### 7. Slices and Arrays

Fixed-size vs dynamic:

```zig
// Fixed-size array (stack allocated)
var pipes: [10]Pipe = undefined;

// Slice (pointer + length)
var active_pipes: []Pipe = pipes[0..5];

// Array initialization
var trail: [20]rl.Vector2 = [_]rl.Vector2{rl.Vector2.init(0, 0)} ** 20;
```

### 8. Structs and Methods

```zig
pub const Ball = struct {
    pos: rl.Vector2,
    radius: f32 = 30.0,
    
    // Method - takes *Ball as first parameter
    pub fn update(self: *Ball, dt: f32) void {
        self.pos.x += dt;
    }
    
    // Function - no self parameter
    pub fn create(x: f32, y: f32) Ball {
        return Ball{ .pos = rl.Vector2.init(x, y) };
    }
};
```

---

## Game Development Concepts

### 1. Game Loop

The heart of every game:

```zig
while (!rl.windowShouldClose()) {
    // 1. Input (implicit in Raylib event handling)
    
    // 2. Update
    const dt = rl.getFrameTime();
    current_scene.update(dt);
    
    // 3. Render
    rl.beginDrawing();
    rl.clearBackground(.black);
    current_scene.draw();
    rl.endDrawing();
}
```

**Why this structure:**
- Separation of logic and rendering
- Predictable execution order
- Easy to debug and profile

### 2. Delta Time (dt)

Frame-independent movement:

```zig
// WRONG: Frame-dependent
pos.x += 5;  // Moves 5 pixels per frame (varies with FPS)

// RIGHT: Frame-independent
pos.x += 5 * dt;  // Moves 5 pixels per second (consistent)
```

**Why it matters:**
- Same behavior on slow and fast computers
- 60 FPS vs 144 FPS looks the same
- Physics simulation accuracy

**In Flappy Zig:**
```zig
// Gravity application
self.physics.velocity = self.physics.velocity.add(
    self.physics.gravity.scale(dt)
);

// Position update
self.pos = self.pos.add(self.physics.velocity.scale(dt));
```

### 3. State Management

Finite State Machine (FSM) for game states:

```
┌─────────┐
│  Intro  │
└────┬────┘
     │ (Space pressed)
     ▼
┌─────────┐
│  Game   │
└────┬────┘
     │ (Collision)
     ▼
┌─────────┐
│   End   │
└────┬────┘
     │ (Space pressed)
     ▼
   (Back to Intro)
```

**Implementation:**
```zig
// Each scene can request transitions
pub fn update(self: *Scene, dt: f32) ?SceneTag {
    return switch (self.*) {
        .GameScene => |*game| game.update(dt),
        // Returns null or SceneTag
    };
}
```

### 4. Object Pooling

Pre-allocate objects to avoid runtime allocation:

```zig
pub const Pipes = struct {
    pipe_pool: struct {
        pipes: [10]Pipe = undefined,  // Pre-allocated
        active_count: usize = 0,
    },
    
    pub fn spawn(self: *Pipes) ?*Pipe {
        if (self.pipe_pool.active_count >= 10) return null;
        
        const pipe = &self.pipe_pool.pipes[self.pipe_pool.active_count];
        self.pipe_pool.active_count += 1;
        return pipe;
    }
};
```

**Benefits:**
- No garbage collection pauses
- Predictable memory usage
- Better cache locality
- Faster than dynamic allocation

### 5. Collision Detection

Circle vs Rectangle (AABB):

```zig
fn checkCollisionCircleRec(center: Vector2, radius: f32, rec: Rectangle) bool {
    // Find closest point on rectangle to circle center
    const closest_x = clamp(center.x, rec.x, rec.x + rec.width);
    const closest_y = clamp(center.y, rec.y, rec.y + rec.height);
    
    // Calculate distance from circle center to closest point
    const dx = center.x - closest_x;
    const dy = center.y - closest_y;
    const distance_squared = dx * dx + dy * dy;
    
    // Collision if distance <= radius
    return distance_squared <= (radius * radius);
}
```

**Optimization:**
- Use squared distance (avoids sqrt)
- Early exit when no collision
- Separate top and bottom pipes

### 6. Camera and Coordinate Systems

Understanding screen space:

```
Screen Coordinates (Pixels):
┌─────────────────┐
│ (0,0)           │  Top-left origin
│                 │
│        *        │  Center (width/2, height/2)
│    (x,y)        │
│                 │
│           (w,h) │  Bottom-right
└─────────────────┘

Shader Coordinates (gl_FragCoord):
┌─────────────────┐
│           (w,h) │  Top-right
│                 │
│        *        │  Center
│    (x,y)        │
│                 │
│ (0,0)           │  Bottom-left origin
└─────────────────┘
```

**Conversion needed:**
```zig
// Convert screen Y to shader Y
const shader_y = screen_height - screen_y;
```

---

## Graphics Programming

### 1. Shader Basics

Shaders are programs that run on the GPU:

**Vertex Shader (.vert):**
- Processes each vertex
- Transforms positions
- Passes data to fragment shader

**Fragment Shader (.frag):**
- Processes each pixel
- Calculates final color
- Has access to interpolated vertex data

### 2. Uniforms

CPU → GPU data transfer:

```zig
// CPU (Zig)
const time_uniform = rl.getShaderLocation(shader, "u_time");
rl.setShaderValue(shader, time_uniform, &[_]f32{time}, .float);

// GPU (GLSL)
uniform float u_time;

void main() {
    // Use u_time for animation
    float wave = sin(u_time * 2.0);
}
```

### 3. Procedural Noise

Creating organic shapes without textures:

```glsl
// Simple noise function
float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    
    // Hash grid coordinates
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    
    // Smooth interpolation
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}
```

**Fractional Brownian Motion (FBM):**
```glsl
float fbm(vec2 st) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 3; i++) {
        value += amplitude * noise(st);
        st *= 2.0;        // Octave frequency
        amplitude *= 0.5;  // Octave amplitude
    }
    return value;
}
```

### 4. Color Blending

Creating smooth transitions:

```glsl
// Linear interpolation
vec3 color = mix(color1, color2, t);  // t in [0,1]

// Additive blending (glow effects)
final_color.rgb += glow_color * intensity;

// Multiplicative blending (shadows)
final_color.rgb *= shadow_factor;
```

### 5. Distance Fields

Smooth edges and effects:

```glsl
// Distance from point to circle
float dist = length(uv - center);

// Smooth step creates anti-aliased edges
float alpha = smoothstep(radius + edge, radius - edge, dist);
//                       outer      inner
```

---

## Code Walkthroughs

### Physics Update (Step-by-Step)

```zig
pub fn update(self: *Ball, dt: f32) void {
    // 1. Apply gravity
    self.physics.velocity = self.physics.velocity.add(
        self.physics.gravity.scale(dt)
    );
    // velocity.y increases (downward)
    
    // 2. Calculate new position
    const new_pos = self.pos.add(
        self.physics.velocity.scale(dt)
    );
    // position changes based on velocity
    
    // 3. Clamp to screen bounds
    const screen_h = @as(f32, @floatFromInt(rl.getScreenHeight()));
    const max_pos = rl.Vector2.init(screen_w - self.radius, screen_h - self.radius);
    self.pos = new_pos.clamp(min_pos, max_pos);
    // ensure ball stays on screen
    
    // 4. Handle collisions
    if (self.pos.y >= screen_h - self.radius) {
        self.physics.velocity.y *= -0.6;  // Bounce with damping
    }
}
```

### Trail System (Step-by-Step)

```zig
fn updateTrail(self: *Ball, dt: f32) void {
    // 1. Age all existing trail points
    for (&self.trail.points, &self.trail.ages) |*point, *age| {
        point.x -= PIPE_SPEED * dt;  // Move with world
        age.* += dt;                  // Increase age
    }
    
    // 2. Update spawn timer
    self.trail.update_timer += dt;
    
    // 3. Spawn new trail point when ready
    if (self.trail.update_timer >= self.trail.update_interval) {
        self.trail.update_timer = 0.0;
        
        // Add current position
        self.trail.points[self.trail.current_index] = self.pos;
        self.trail.ages[self.trail.current_index] = 0.0;
        
        // Move to next index (circular buffer)
        self.trail.current_index = 
            (self.trail.current_index + 1) % self.trail.points.len;
    }
}
```

### Collision Detection (Step-by-Step)

```zig
fn check_pipe_collision(self: *GameplayScene, pipe: *Pipe) bool {
    // 1. Create rectangles for top and bottom pipe segments
    const topRec = rl.Rectangle.init(
        @as(f32, @floatFromInt(pipe.xpos)),
        0,
        @as(f32, @floatFromInt(pipe.width)),
        @as(f32, @floatFromInt(pipe.gap))
    );
    
    const bottomRec = rl.Rectangle.init(
        @as(f32, @floatFromInt(pipe.xpos)),
        @as(f32, @floatFromInt(pipe.gap + pipe.gap_size)),
        @as(f32, @floatFromInt(pipe.width)),
        700
    );
    
    // 2. Check collision with both segments
    const top_collision = rl.checkCollisionCircleRec(
        self.ball.pos, 
        self.ball.radius, 
        topRec
    );
    
    const bottom_collision = rl.checkCollisionCircleRec(
        self.ball.pos, 
        self.ball.radius, 
        bottomRec
    );
    
    // 3. Return true if either collision detected
    return top_collision or bottom_collision;
}
```

---

## Common Patterns

### 1. Init/Deinit Pattern

```zig
const MyStruct = struct {
    resource: Resource,
    
    pub fn init(self: *MyStruct) !void {
        self.resource = try acquireResource();
    }
    
    pub fn deinit(self: *MyStruct) void {
        releaseResource(self.resource);
    }
};

// Usage
var obj = MyStruct{};
try obj.init();
defer obj.deinit();  // Ensures cleanup
```

### 2. Circular Buffer

```zig
const Buffer = struct {
    data: [SIZE]T,
    index: usize = 0,
    
    pub fn push(self: *Buffer, item: T) void {
        self.data[self.index] = item;
        self.index = (self.index + 1) % SIZE;
    }
    
    pub fn get(self: *Buffer, offset: usize) T {
        const idx = (self.index + SIZE - 1 - offset) % SIZE;
        return self.data[idx];
    }
};
```

### 3. State Machine Pattern

```zig
const State = enum { Idle, Running, Jumping };

const Entity = struct {
    state: State = .Idle,
    
    pub fn update(self: *Entity) void {
        switch (self.state) {
            .Idle => self.updateIdle(),
            .Running => self.updateRunning(),
            .Jumping => self.updateJumping(),
        }
    }
};
```

---

## Exercises and Challenges

### Beginner

1. **Change Game Parameters**
   - Modify `flap_boost` in `ball.zig` (line 8)
   - Change `gravity` value (line 32)
   - Adjust `spawn_interval` in `pipe.zig`

2. **Visual Tweaks**
   - Change ball color in shader
   - Modify trail length (array size)
   - Adjust pipe gap size

3. **Add Debug Info**
   - Display velocity on screen
   - Show FPS counter
   - Print collision detection state

### Intermediate

1. **New Features**
   - Add score multiplier for close calls
   - Implement difficulty progression
   - Add power-ups

2. **Physics Modifications**
   - Add air resistance
   - Implement double jump
   - Create wall bouncing

3. **Visual Effects**
   - Add screen shake on collision
   - Create particle explosion effect
   - Implement color transitions

### Advanced

1. **Architecture Changes**
   - Add entity component system
   - Implement save/load system
   - Create replay functionality

2. **Shader Programming**
   - Add custom shader effects
   - Implement post-processing
   - Create procedural textures

3. **Performance**
   - Profile and optimize hot paths
   - Implement spatial partitioning
   - Add multithreading for physics

---

## Learning Resources

### Zig

- [Official Zig Documentation](https://ziglang.org/documentation/master/)
- [Zig Learn](https://ziglearn.org/)
- [Zig by Example](https://zig-by-example.com/)

### Game Development

- [Game Programming Patterns](https://gameprogrammingpatterns.com/)
- [Raylib Cheatsheet](https://www.raylib.com/cheatsheet/cheatsheet.html)
- [Fix Your Timestep](https://gafferongames.com/post/fix_your_timestep/)

### Graphics

- [The Book of Shaders](https://thebookofshaders.com/)
- [Shadertoy](https://www.shadertoy.com/)
- [Learn OpenGL](https://learnopengl.com/)

---

## Conclusion

Flappy Zig demonstrates many important concepts:

- **Memory safety** without garbage collection
- **Performance** through compile-time optimization
- **Clarity** via explicit resource management
- **Modularity** with clean architecture

By studying this codebase and experimenting with modifications, you'll gain practical experience with both Zig and game development. Start small, experiment often, and don't be afraid to break things!

Happy Learning! 🚀
