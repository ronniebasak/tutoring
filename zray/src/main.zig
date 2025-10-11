//! Flappy Zig - Main Entry Point
//! 
//! This is a Flappy Bird-style game built with Zig and Raylib, featuring custom
//! GLSL shaders for organic visual effects. The game demonstrates modern game
//! development patterns in Zig including:
//! - Scene-based state management using tagged unions
//! - Component-based entity system
//! - Frame-independent physics
//! - Custom shader pipeline
//!
//! For more information, see:
//! - README.md - Getting started and features
//! - ARCHITECTURE.md - Detailed architecture documentation
//! - LEARNING.md - Learning resources for Zig and game development

const rl = @import("raylib");
const std = @import("std");
const scenes = @import("scenes.zig");
const scene_types = @import("scenes/scene_types.zig");

/// Main entry point for Flappy Zig
/// 
/// Sets up the game window, initializes the first scene, and runs the main game loop.
/// The game loop follows the standard pattern:
/// 1. Process input (handled by Raylib events)
/// 2. Update game state
/// 3. Render frame
pub fn main() anyerror!void {
    // Initialization
    //--------------------------------------------------------------------------------------
    const screenWidth: i32 = 1000;
    const screenHeight: i32 = 700;

    // Configure window settings before creation
    // - window_resizable: Allows the player to resize the window
    // - msaa_4x_hint: Disabled to let shaders handle anti-aliasing
    rl.setConfigFlags(rl.ConfigFlags{
        .window_resizable = true,
        .msaa_4x_hint = false,
    });
    
    // Create game window
    rl.initWindow(screenWidth, screenHeight, "FlapZig");
    defer rl.closeWindow(); // Ensures window cleanup on exit
    
    // Set target frame rate to 120 FPS
    // Physics uses delta time (dt), so actual FPS won't affect gameplay
    rl.setTargetFPS(120);

    // Initialize the first scene (Intro screen)
    // Using tagged union for type-safe scene management
    var current_scene = scenes.Scene{ .IntroScene = .{} };
    current_scene.init();
    defer current_scene.deinit(); // Cleanup when main loop exits

    // Main game loop
    // Runs until window close button or ESC key is pressed
    while (!rl.windowShouldClose()) {
        // Get delta time (time since last frame) for frame-independent movement
        const dt = rl.getFrameTime();
        
        // Update current scene and check for scene transitions
        // Returns null to stay in current scene, or SceneTag to transition
        const ns = current_scene.update(dt);

        // Handle scene transitions if requested
        if (ns) |unwrapped_ns| {
            // Clean up current scene before transitioning
            current_scene.deinit();
            
            // Create new scene based on the requested tag
            switch (unwrapped_ns) {
                scene_types.SceneTag.GameScene => {
                    current_scene = scenes.Scene{ .GameScene = .{} };
                },
                scene_types.SceneTag.IntroScene => {
                    current_scene = scenes.Scene{ .IntroScene = .{} };
                },
                scene_types.SceneTag.EndScene => {
                    current_scene = scenes.Scene{ .EndScene = .{} };
                },
            }
            
            // Initialize the new scene
            current_scene.init();
        }

        // Begin rendering frame
        rl.beginDrawing();
        defer rl.endDrawing(); // Ensures endDrawing is called even if error occurs

        // Clear screen and render current scene
        rl.clearBackground(.black);
        current_scene.draw();
    }
}
