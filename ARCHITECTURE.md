# Architecture Documentation

This document provides an in-depth look at the architecture of Flappy Zig, explaining the design patterns, systems, and implementation details.

## Table of Contents

1. [Overview](#overview)
2. [Scene Management System](#scene-management-system)
3. [Game Loop Architecture](#game-loop-architecture)
4. [Component Systems](#component-systems)
5. [Physics System](#physics-system)
6. [Shader Pipeline](#shader-pipeline)
7. [Build System](#build-system)
8. [Memory Management](#memory-management)

---

## Overview

Flappy Zig follows a component-based architecture with a scene management system built on Zig's tagged unions. The game is structured to be modular, maintainable, and serve as an educational resource.

### Design Philosophy

- **Type Safety**: Leveraging Zig's compile-time guarantees
- **Zero-cost Abstractions**: No runtime overhead for abstractions
- **Clear Ownership**: Explicit resource management with init/deinit patterns
- **Modular Design**: Each component has a single responsibility

---

## Scene Management System

### Scene Types

The game uses a **tagged union** for scene management, defined in `src/scenes/scene_types.zig`:

```zig
pub const SceneTag = enum {
    IntroScene,
    GameScene,
    EndScene,
};
```

### Scene Union

The `Scene` union in `src/scenes.zig` provides a unified interface:

```zig
pub const Scene = union(SceneTag) {
    IntroScene: IntroScene,
    GameScene: GameScene,
    EndScene: EndScene,
    
    pub fn init(self: *Scene) void { ... }
    pub fn deinit(self: *Scene) void { ... }
    pub fn update(self: *Scene, dt: f32) ?SceneTag { ... }
    pub fn draw(self: *Scene) void { ... }
};
```

### Scene Lifecycle

1. **Initialization**: `init()` loads resources (shaders, textures)
2. **Update**: `update(dt)` processes logic and returns optional scene transition
3. **Render**: `draw()` renders the scene
4. **Cleanup**: `deinit()` frees resources

### Scene Transitions

Scenes can request transitions by returning a `SceneTag`:

```zig
// In main.zig
const ns = current_scene.update(dt);
if (ns) |unwrapped_ns| {
    current_scene.deinit();  // Clean up old scene
    current_scene = scenes.Scene{ .GameScene = .{} };
    current_scene.init();  // Initialize new scene
}
```

**Benefits:**
- Type-safe scene transitions
- No memory leaks (explicit cleanup)
- Clear state boundaries
- Easy to add new scenes

---

## Game Loop Architecture

### Main Loop Structure

Located in `src/main.zig`:

```zig
while (!rl.windowShouldClose()) {
    const dt = rl.getFrameTime();           // Delta time
    const ns = current_scene.update(dt);    // Update logic
    
    // Handle scene transitions
    if (ns) |unwrapped_ns| { ... }
    
    rl.beginDrawing();
    defer rl.endDrawing();
    
    rl.clearBackground(.black);
    current_scene.draw();                   // Render
}
```

### Frame Timing

- **Target FPS**: 120 (set via `rl.setTargetFPS(120)`)
- **Delta Time**: Frame-independent physics via `dt`
- **VSync**: Enabled by default through Raylib

---

## Component Systems

### Ball Component (`src/scenes/game/ball.zig`)

The player character with multiple subsystems:

#### Physics Subsystem

```zig
physics: struct {
    gravity: rl.Vector2 = rl.Vector2.init(0, 2000.0),
    velocity: rl.Vector2 = rl.Vector2.init(0, 0),
    smoothed_velocity: rl.Vector2 = rl.Vector2.init(0, 0),
    velocity_history: [5]rl.Vector2 = ...,
    history_index: usize = 0,
}
```

**Features:**
- Gravity-based motion
- Velocity smoothing for visual effects
- Clamped movement within screen bounds
- Bounce damping on collisions

#### Trail System

```zig
trail: struct {
    points: [20]rl.Vector2 = ...,
    ages: [20]f32 = ...,
    current_index: usize = 0,
    update_timer: f32 = 0.0,
    update_interval: f32 = 0.02,
}
```

**Implementation:**
- Circular buffer for trail points
- Age-based fading
- World-space movement compensation
- Shader-based rendering

### Pipe System (`src/scenes/game/pipe.zig`)

#### Pipe Pool Pattern

```zig
pub const Pipes = struct {
    pipe_pool: struct {
        pipes: [MAX_PIPES]Pipe = ...,
        active_count: usize = 0,
    },
    spawn_timer: f32 = 0.0,
    spawn_interval: f32 = 2.0,
};
```

**Object Pooling Benefits:**
- No dynamic allocation during gameplay
- Predictable memory usage
- Cache-friendly data layout
- No garbage collection pauses

#### Collision Detection

```zig
fn check_pipe_collision(self: *GameplayScene, pipe: *Pipe) bool {
    const topRec = rl.Rectangle.init(tx, ty, tw, th);
    const bottomRec = rl.Rectangle.init(bx, by, bw, bh);
    
    return rl.checkCollisionCircleRec(self.ball.pos, self.ball.radius, topRec) 
        or rl.checkCollisionCircleRec(self.ball.pos, self.ball.radius, bottomRec);
}
```

**Algorithm:**
- Circle vs Rectangle collision (AABB)
- Separate top and bottom pipe segments
- Early exit on collision detection

### Background System (`src/scenes/game/background.zig`)

- Shader-based parallax scrolling
- Continuous movement synchronized with pipes
- Procedural visual effects via shaders

---

## Physics System

### Motion Equations

```zig
// Gravity application
velocity = velocity + gravity * dt

// Position update
pos = pos + velocity * dt

// Boundary clamping
pos = clamp(pos, min_pos, max_pos)
```

### Flap Mechanics

```zig
pub fn flap(self: *Ball) void {
    self.physics.velocity = rl.Vector2.init(0, -self.flap_boost);
}
```

- Instant velocity change (no gradual acceleration)
- Negative Y velocity (upward)
- `flap_boost = 550.0` provides good feel

### Velocity Smoothing

Used for visual effects (shader deformation):

```zig
fn updateVelocitySmoothing(self: *Ball) void {
    // Store in circular buffer
    self.physics.velocity_history[self.physics.history_index] = self.physics.velocity;
    self.physics.history_index = (self.physics.history_index + 1) % 5;
    
    // Average recent velocities
    var sum = rl.Vector2.init(0, 0);
    for (self.physics.velocity_history) |vel| {
        sum = sum.add(vel);
    }
    self.physics.smoothed_velocity = sum.scale(1.0 / 5.0);
}
```

---

## Shader Pipeline

### Shader Architecture

#### Organic Shader (`shaders/organic.frag`)

**Uniforms:**
- `u_time`: Animation time
- `u_center`: Ball position
- `u_radius`: Ball radius
- `u_velocity`: For deformation effects
- `u_trail_points[20]`: Trail positions
- `u_trail_count`: Active trail points
- `u_eye_target`: Eye look direction (unused but available)

**Techniques Used:**

1. **Fractional Brownian Motion (FBM)**
```glsl
float fbm(vec2 st) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 3; i++) {
        value += amplitude * noise(st);
        st *= 2.0;
        amplitude *= 0.5;
    }
    return value;
}
```
- Creates organic, natural-looking shapes
- Multiple octaves of noise
- Decreasing amplitude for fine detail

2. **Shape Deformation**
```glsl
// Velocity-based squash and stretch
float directional_alignment = dot(dir, -vel_normalized);
float deformation = 1.0 + clamp(alignment * vel_magnitude, -0.15, 0.15);

// Apply organic wobble
float wobble = sin(u_time * 2.5 + atan(dir.y, dir.x) * 2.0) * 0.04;
```

3. **Trail Rendering**
- Age-based size and opacity
- Additive blending for glow
- Sparkle effects on newer segments
- World-space movement compensation

4. **Eye Animation**
- Procedural blinking cycle
- Pupil offset for look direction
- Highlight/specular effects
- Smooth eyelid animation

### Shader Data Flow

```
CPU (Zig)                    GPU (GLSL)
─────────                    ──────────
Ball state     ──uniforms──> Shader processing
Trail data     ──uniforms──> Procedural effects
Time/velocity  ──uniforms──> Animation
                             │
                             ├─> FBM noise
                             ├─> Deformation
                             ├─> Trail rendering
                             ├─> Eye animation
                             └─> Final color
```

---

## Build System

### Build.zig Structure

```zig
pub fn build(b: *std.Build) void {
    const target = b.standardTargetOptions(.{});
    const optimize = b.standardOptimizeOption(.{});
    
    // Library module
    const lib_mod = b.createModule(.{
        .root_source_file = b.path("src/root.zig"),
        .target = target,
        .optimize = optimize,
    });
    
    // Executable module
    const exe_mod = b.createModule(.{
        .root_source_file = b.path("src/main.zig"),
        .target = target,
        .optimize = optimize,
    });
    
    exe_mod.addImport("zray_lib", lib_mod);
    
    // Raylib integration
    const raylib_dep = b.dependency("raylib_zig", .{
        .target = target,
        .optimize = optimize,
    });
    
    exe.linkLibrary(raylib_dep.artifact("raylib"));
    exe.root_module.addImport("raylib", raylib_dep.module("raylib"));
}
```

### Dependency Management

Defined in `build.zig.zon`:

```zig
.dependencies = .{
    .raylib_zig = .{
        .url = "git+https://github.com/raylib-zig/raylib-zig?ref=devel#...",
        .hash = "...",
    },
},
```

**Benefits:**
- Reproducible builds
- Version pinning
- Automatic dependency fetching

---

## Memory Management

### Resource Lifecycle Pattern

All components follow the init/deinit pattern:

```zig
pub fn init(self: *T) !void {
    // Allocate resources
    self.shader = try rl.loadShader(...);
    self.texture = try rl.loadTexture(...);
}

pub fn deinit(self: *T) void {
    // Free resources
    rl.unloadShader(self.shader);
    rl.unloadTexture(self.texture);
}
```

### Error Handling

```zig
// Explicit error propagation
scene.init() catch |e| std.debug.print("Failed: {}", .{e});

// Or error union returns
pub fn init(self: *Ball) anyerror!void {
    self.shader = try rl.loadShader(...);  // Propagates error
}
```

### Stack vs Heap Allocation

- **Stack**: All game objects (Ball, Pipes, Scenes)
- **Heap**: Only external resources (shaders, textures via Raylib)
- **No manual malloc/free**: Leveraging Zig's explicit resource management

---

## Performance Considerations

### Optimization Techniques

1. **Object Pooling**: Pre-allocated pipe array
2. **Cache-Friendly Data**: Contiguous arrays for trail points
3. **Minimal Branching**: Shader code optimized for GPU
4. **Frame-Independent Physics**: Scales with dt
5. **Efficient Collision**: Early exit on detection

### Profiling Points

- Frame time via `rl.getFrameTime()`
- FPS monitoring via `rl.getFPS()`
- Shader compilation is one-time cost at init

---

## Extending the Architecture

### Adding a New Scene

1. Create scene struct in `src/scenes/`
2. Add to `SceneTag` enum
3. Add to `Scene` union
4. Implement init/deinit/update/draw
5. Add transition logic

### Adding a New Component

1. Create struct with init/deinit
2. Add to parent scene
3. Call lifecycle methods appropriately
4. Consider shader integration if visual

### Modifying Shaders

1. Edit `.frag` or `.vert` files
2. Update uniform definitions if needed
3. Update Zig code to pass new uniforms
4. Test with `zig build run`

---

## Conclusion

The architecture of Flappy Zig demonstrates several key principles:

- **Type Safety**: Zig's type system prevents entire classes of bugs
- **Explicit Resource Management**: No hidden allocations or leaks
- **Modular Design**: Easy to understand and extend
- **Performance**: Close to metal with zero-cost abstractions

This architecture serves as a solid foundation for learning game development concepts while leveraging modern systems programming practices.
