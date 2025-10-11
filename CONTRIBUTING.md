# Contributing to Flappy Zig

Thank you for your interest in contributing to Flappy Zig! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Setup](#development-setup)
4. [Code Style Guidelines](#code-style-guidelines)
5. [Making Changes](#making-changes)
6. [Testing](#testing)
7. [Submitting Changes](#submitting-changes)
8. [Project Structure](#project-structure)
9. [Common Tasks](#common-tasks)

---

## Code of Conduct

This project adheres to a simple code of conduct:

- **Be respectful**: Treat everyone with respect and consideration
- **Be constructive**: Provide helpful feedback and suggestions
- **Be collaborative**: Work together to improve the project
- **Be patient**: Remember that everyone is learning

---

## Getting Started

### Prerequisites

Before contributing, ensure you have:

- **Zig 0.14.1 or later**: [Download Zig](https://ziglang.org/download/)
- **Git**: For version control
- **A text editor or IDE**: VS Code, Vim, Emacs, etc.
- **Basic knowledge** of Zig and game development (see [LEARNING.md](LEARNING.md))

### Finding an Issue

Good first contributions:

1. Check the [Issues](https://github.com/ronniebasak/zig-raylib-games/issues) page
2. Look for issues labeled `good first issue` or `help wanted`
3. Comment on the issue to let others know you're working on it
4. Ask questions if anything is unclear

### Types of Contributions

We welcome:

- **Bug fixes**: Fix crashes, visual glitches, or gameplay issues
- **New features**: Add game mechanics, visual effects, or scenes
- **Documentation**: Improve README, add tutorials, or clarify code
- **Performance**: Optimize hot paths or reduce memory usage
- **Tests**: Add unit tests or integration tests
- **Examples**: Create examples demonstrating specific features

---

## Development Setup

### 1. Fork and Clone

```bash
# Fork the repository on GitHub, then:
git clone https://github.com/YOUR_USERNAME/zig-raylib-games.git
cd zig-raylib-games/zray
```

### 2. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-description
```

### 3. Build and Test

```bash
# Build the project
zig build

# Run the game
zig build run

# Run tests
zig build test
```

### 4. Make Your Changes

See [Making Changes](#making-changes) section below.

---

## Code Style Guidelines

### General Principles

- **Clarity over cleverness**: Readable code is better than clever code
- **Explicit over implicit**: Make intentions clear
- **Simple over complex**: Choose simple solutions when possible
- **Documented edge cases**: Comment on non-obvious behavior

### Zig Style

Follow the [Zig Style Guide](https://ziglang.org/documentation/master/#Style-Guide):

#### Naming Conventions

```zig
// Types: PascalCase
pub const GameScene = struct { ... };

// Functions and methods: camelCase
pub fn updatePhysics(dt: f32) void { ... }

// Constants: SCREAMING_SNAKE_CASE
const MAX_PIPES = 10;
const PIPE_SPEED = 200.0;

// Variables: snake_case
var current_score: u32 = 0;
var is_game_over = false;
```

#### Formatting

```zig
// Use 4 spaces for indentation (Zig standard)
pub fn update(self: *Ball, dt: f32) void {
    if (condition) {
        doSomething();
    }
}

// Line length: aim for 100 characters, max 120

// Use trailing commas in multiline lists
const colors = [_]Color{
    .red,
    .green,
    .blue,  // trailing comma
};
```

#### Comments

```zig
// Use // for single-line comments

/// Use /// for documentation comments (appears in generated docs)
/// This function updates the ball's position based on physics.
/// 
/// Parameters:
/// - dt: Delta time in seconds
pub fn update(self: *Ball, dt: f32) void { ... }

// TODO: Add feature X
// FIXME: Fix bug Y
// NOTE: Important information
```

#### Error Handling

```zig
// Explicit error propagation
pub fn init(self: *T) !void {
    self.resource = try loadResource();  // Propagate error
}

// Error handling with context
scene.init() catch |err| {
    std.log.err("Failed to initialize scene: {}", .{err});
    return err;
};
```

#### Memory Management

```zig
// Always pair init/deinit
pub fn init(self: *T) !void {
    // Acquire resources
}

pub fn deinit(self: *T) void {
    // Release resources
}

// Use defer for cleanup
var texture = try rl.loadTexture("image.png");
defer rl.unloadTexture(texture);
```

### GLSL Shader Style

```glsl
// Uniforms: u_ prefix
uniform float u_time;
uniform vec2 u_center;

// Functions: camelCase
float calculateNoise(vec2 st) {
    return fract(sin(dot(st, vec2(12.9898, 78.233))) * 43758.5453);
}

// Comments for complex math
// Calculate fractional Brownian motion for organic shapes
float fbm(vec2 st) {
    // Implementation
}
```

---

## Making Changes

### Adding a New Feature

#### 1. Plan Your Changes

- Understand the existing architecture (see [ARCHITECTURE.md](ARCHITECTURE.md))
- Identify where your changes fit
- Consider backward compatibility
- Think about edge cases

#### 2. Implement

Example: Adding a new scene

```zig
// 1. Create scene file: src/scenes/newsecene.zig
const std = @import("std");
const rl = @import("raylib");
const scene_types = @import("scene_types.zig");

pub const NewScene = struct {
    // Scene state
    
    pub fn init(self: *NewScene) !void {
        // Initialize resources
    }
    
    pub fn deinit(self: *NewScene) void {
        // Cleanup
    }
    
    pub fn update(self: *NewScene, dt: f32) ?scene_types.SceneTag {
        // Update logic
        return null;  // or return scene transition
    }
    
    pub fn draw(self: *NewScene) void {
        // Render
    }
};

// 2. Add to scene_types.zig
pub const SceneTag = enum {
    IntroScene,
    GameScene,
    EndScene,
    NewScene,  // Add here
};

// 3. Add to scenes.zig
const NewScene = @import("scenes/newscene.zig").NewScene;

pub const Scene = union(SceneTag) {
    IntroScene: IntroScene,
    GameScene: GameScene,
    EndScene: EndScene,
    NewScene: NewScene,  // Add here
    
    pub fn init(self: *Scene) void {
        return switch (self.*) {
            // ...
            .NewScene => |*scene| scene.init() catch |e| std.debug.print("Error: {}", .{e}),
        };
    }
    
    // Update other methods similarly
};
```

#### 3. Test Your Changes

```bash
# Build and run
zig build run

# Test thoroughly:
# - Scene transitions
# - Resource cleanup
# - Error conditions
# - Edge cases
```

### Modifying Shaders

```glsl
// 1. Edit shader file in shaders/
// 2. Document new uniforms

// New uniform for feature X
uniform float u_new_parameter;

// 3. Update Zig code to pass uniform

const param_location = rl.getShaderLocation(shader, "u_new_parameter");
rl.setShaderValue(shader, param_location, &[_]f32{value}, .float);
```

### Fixing Bugs

1. **Reproduce the bug**: Understand the exact conditions
2. **Identify the cause**: Use print statements or debugger
3. **Fix the issue**: Make minimal, targeted changes
4. **Test thoroughly**: Ensure fix doesn't break anything
5. **Add tests**: Prevent regression

---

## Testing

### Manual Testing

```bash
# Run the game
zig build run

# Test checklist:
# - [ ] Game launches without errors
# - [ ] All scenes load correctly
# - [ ] Input works as expected
# - [ ] No visual glitches
# - [ ] No crashes during gameplay
# - [ ] Resources cleanup properly (no memory leaks)
```

### Unit Testing

Add tests to your module:

```zig
test "ball physics update" {
    var ball = Ball{ .pos = rl.Vector2.init(100, 100) };
    ball.init() catch return error.SkipZigTest;
    defer ball.deinit();
    
    ball.update(1.0);
    
    try std.testing.expect(ball.pos.y > 100);  // Ball should fall
}
```

Run tests:

```bash
zig build test
```

### Integration Testing

Test scene transitions:

```zig
test "scene transition" {
    var scene = scenes.Scene{ .IntroScene = .{} };
    scene.init();
    defer scene.deinit();
    
    // Simulate game start
    const next = scene.update(0.016);
    try std.testing.expect(next == .GameScene);
}
```

---

## Submitting Changes

### Before Submitting

Checklist:

- [ ] Code builds without errors: `zig build`
- [ ] Code runs without crashes: `zig build run`
- [ ] Tests pass: `zig build test`
- [ ] Code follows style guidelines
- [ ] Comments added for complex logic
- [ ] Documentation updated if needed
- [ ] No commented-out code (remove or explain)
- [ ] No debug print statements (unless intentional)

### Commit Guidelines

Write clear commit messages:

```bash
# Good commit messages
git commit -m "Add double jump mechanic to ball physics"
git commit -m "Fix collision detection for small pipes"
git commit -m "Optimize shader trail rendering"

# Structure for larger commits:
git commit -m "Add pause menu scene

- Created new PauseScene struct
- Added pause/resume functionality
- Updated scene transitions
- Added keyboard shortcut (P key)"
```

### Creating a Pull Request

1. **Push your branch**:
```bash
git push origin feature/your-feature-name
```

2. **Open Pull Request** on GitHub

3. **Describe your changes**:
```markdown
## Description
Brief description of what this PR does.

## Changes
- Added X feature
- Fixed Y bug
- Updated Z documentation

## Testing
How to test these changes:
1. Run `zig build run`
2. Press SPACE to test...

## Screenshots (if applicable)
![screenshot](url)

## Related Issues
Fixes #123
```

4. **Wait for review**: Be patient and responsive to feedback

---

## Project Structure

Understanding the codebase:

```
zray/
├── build.zig              # Build configuration
├── build.zig.zon          # Dependencies
├── src/
│   ├── main.zig          # Entry point - game loop
│   ├── root.zig          # Library root
│   ├── scenes.zig        # Scene union and dispatcher
│   └── scenes/
│       ├── scene_types.zig    # Scene type definitions
│       ├── intro.zig          # Intro screen
│       ├── gameplay.zig       # Main game
│       ├── endscreen.zig      # Game over screen
│       └── game/
│           ├── ball.zig       # Player character
│           ├── pipe.zig       # Obstacles
│           └── background.zig # Background rendering
├── shaders/               # GLSL shaders
│   ├── organic.frag      # Ball shader
│   ├── organic.vert      # Ball vertex shader
│   └── ...
└── res/                   # Resources (textures, etc.)
```

---

## Common Tasks

### Adding a New Game Object

```zig
// 1. Create file: src/scenes/game/myobject.zig
pub const MyObject = struct {
    pos: rl.Vector2,
    // ... other fields
    
    pub fn init(self: *MyObject) !void { }
    pub fn deinit(self: *MyObject) void { }
    pub fn update(self: *MyObject, dt: f32) void { }
    pub fn draw(self: *MyObject) void { }
};

// 2. Add to gameplay.zig
const MyObject = @import("game/myobject.zig").MyObject;

pub const GameplayScene = struct {
    my_object: MyObject = MyObject{ .pos = rl.Vector2.init(0, 0) },
    
    pub fn init(self: *GameplayScene) void {
        self.my_object.init() catch |e| std.log.err("Error: {}", .{e});
    }
    
    pub fn update(self: *GameplayScene, dt: f32) ?scene_types.SceneTag {
        self.my_object.update(dt);
        // ...
    }
    
    pub fn draw(self: *GameplayScene) void {
        self.my_object.draw();
        // ...
    }
};
```

### Adjusting Game Feel

```zig
// In ball.zig

// Make jump higher/lower
flap_boost: f32 = 550.0,  // Increase for higher jumps

// In gameplay.zig or ball.zig

// Make gravity stronger/weaker
gravity: rl.Vector2 = rl.Vector2.init(0, 2000.0),  // Increase for faster fall

// In pipe.zig

// Change pipe spacing
spawn_interval: f32 = 2.0,  // Decrease for more frequent pipes

// Change difficulty
gap_size: i32 = 200,  // Decrease for harder game
```

### Adding Visual Effects

```zig
// Simple screen shake example
const ShakeEffect = struct {
    duration: f32 = 0.0,
    intensity: f32 = 10.0,
    
    pub fn trigger(self: *ShakeEffect) void {
        self.duration = 0.2;  // Shake for 0.2 seconds
    }
    
    pub fn update(self: *ShakeEffect, dt: f32) rl.Vector2 {
        if (self.duration <= 0) return rl.Vector2.init(0, 0);
        
        self.duration -= dt;
        const random_x = (std.crypto.random.float(f32) - 0.5) * 2.0 * self.intensity;
        const random_y = (std.crypto.random.float(f32) - 0.5) * 2.0 * self.intensity;
        
        return rl.Vector2.init(random_x, random_y);
    }
};
```

---

## Questions?

If you have questions:

1. Check [LEARNING.md](LEARNING.md) for concepts
2. Check [ARCHITECTURE.md](ARCHITECTURE.md) for structure
3. Search existing issues on GitHub
4. Open a new issue with the `question` label
5. Join discussions on GitHub Discussions (if available)

---

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (MIT License).

---

Thank you for contributing to Flappy Zig! Your efforts help make this a better learning resource for everyone. 🚀
