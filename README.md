# Flappy Zig 🐦

A Flappy Bird-style game built with Zig and Raylib, featuring custom GLSL shaders for visual effects. This project serves as a learning resource for Zig programming, game development, and shader programming.

![Flappy Zig](https://img.shields.io/badge/Zig-0.14.1+-orange.svg)
![Raylib](https://img.shields.io/badge/Raylib-5.6.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## 🎬 Gameplay Video

[![Flappy Zig Gameplay](https://img.youtube.com/vi/7fWj8KrL27k/maxresdefault.jpg)](https://www.youtube.com/watch?v=7fWj8KrL27k)

*Click the image above to watch the gameplay video*

## 🎮 Features

- **Custom Physics Engine**: Smooth gravity and flapping mechanics with velocity smoothing
- **Organic Visual Effects**: GLSL shaders featuring:
  - Fractional Brownian Motion (FBM) for organic shapes
  - Dynamic trail system with particle effects
  - Animated eyes with blinking and eye tracking
  - Jello-like physics deformation
  - Glow and sparkle effects
- **Scene Management**: Clean scene-based architecture (Intro → Gameplay → End Screen)
- **Collision Detection**: Precise circle-rectangle collision system
- **Scrolling Background**: Parallax background with custom shaders

## 🚀 Getting Started

### Prerequisites

- **Zig** (version 0.14.1 or later) - [Download Zig](https://ziglang.org/download/)
- **Git** - For cloning the repository
- **OpenGL** - Should be available on most systems

### Installation

1. Clone the repository:
```bash
git clone https://github.com/ronniebasak/zig-raylib-games.git
cd zig-raylib-games/zray
```

2. Build the project:
```bash
zig build
```

3. Run the game:
```bash
zig build run
```

Alternatively, run both steps in one command:
```bash
zig build run
```

### Build Options

- **Debug build** (default):
  ```bash
  zig build
  ```

- **Release build** (optimized):
  ```bash
  zig build -Doptimize=ReleaseFast
  ```

- **Run tests**:
  ```bash
  zig build test
  ```

## 🎯 How to Play

- **SPACE** - Flap to jump
- **ESC** - Exit the game
- Navigate through pipes without hitting them
- Avoid touching the floor and ceiling
- Try to achieve the highest score!

## 📁 Project Structure

```
zray/
├── build.zig              # Build configuration
├── build.zig.zon          # Dependency management
├── src/
│   ├── main.zig          # Entry point and game loop
│   ├── root.zig          # Library root module
│   ├── scenes.zig        # Scene management system
│   └── scenes/
│       ├── scene_types.zig    # Scene type definitions
│       ├── intro.zig          # Intro screen
│       ├── gameplay.zig       # Main gameplay scene
│       ├── endscreen.zig      # Game over screen
│       └── game/
│           ├── ball.zig       # Player entity
│           ├── pipe.zig       # Obstacle system
│           └── background.zig # Background rendering
├── shaders/
│   ├── organic.frag      # Main character shader (GLSL)
│   ├── organic.vert      # Vertex shader
│   ├── pipe_organic.frag # Pipe shader
│   ├── pipe_organic.vert # Pipe vertex shader
│   ├── background.frag   # Background shader
│   └── background.vert   # Background vertex shader
└── res/
    └── umadbro.png       # Game texture assets
```

## 🏗️ Architecture Highlights

### Scene Management
The game uses a tagged union-based scene system for clean state management:
- `IntroScene`: Title screen
- `GameScene`: Main gameplay
- `EndScene`: Game over screen

Each scene implements a consistent interface: `init()`, `deinit()`, `update()`, and `draw()`.

### Component System
- **Ball**: Player character with physics, trail rendering, and shader effects
- **Pipes**: Dynamic obstacle generation with collision detection
- **Background**: Scrolling background with shader-based effects

### Shader Pipeline
Custom GLSL shaders for visual effects:
- Procedural noise functions (FBM)
- Real-time deformation based on velocity
- Trail particle system rendered in shaders
- Animated eyes with blinking

## 🎓 Learning Resources

This project is designed to be educational. Check out these files:
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Detailed architecture documentation
- **[LEARNING.md](LEARNING.md)** - Zig and game dev concepts explained
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - How to contribute to the project

## 🛠️ Technologies Used

- **[Zig](https://ziglang.org/)** - Modern, fast, and safe systems programming language
- **[Raylib](https://www.raylib.com/)** - Simple and easy-to-use game development library
- **[raylib-zig](https://github.com/raylib-zig/raylib-zig)** - Zig bindings for Raylib
- **GLSL** - OpenGL Shading Language for custom visual effects

## 🤝 Contributing

Contributions are welcome! Whether you want to:
- Add new features or game modes
- Improve the shaders
- Fix bugs
- Enhance documentation

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 👏 Acknowledgments

- **Raylib** community for the game development library
- **Zig** language developers for the systems programming language
- Flappy Bird for the original game concept
- The game development community for shader programming resources

## 📧 Contact

- GitHub: [@ronniebasak](https://github.com/ronniebasak)
- Repository: [zig-raylib-games](https://github.com/ronniebasak/zig-raylib-games)

---

**Happy Coding! 🚀** If you found this project helpful, please consider giving it a star ⭐
