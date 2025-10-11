//! Scene Management System
//!
//! This module implements a type-safe scene management system using Zig's tagged unions.
//! Each scene represents a distinct game state (intro, gameplay, end screen) and
//! implements a consistent interface for lifecycle management.
//!
//! Architecture:
//! - Tagged union ensures only one scene is active at a time
//! - Compile-time safety prevents invalid scene transitions
//! - Uniform interface (init/deinit/update/draw) simplifies scene handling
//!
//! Scene Flow:
//! IntroScene → GameScene → EndScene → (back to IntroScene)

const std = @import("std");
const sc = @import("scenes/scene_types.zig");
const IntroScene = @import("scenes/intro.zig").IntroScene;
const GameScene = @import("scenes/gameplay.zig").GameplayScene;
const EndScene = @import("scenes/endscreen.zig").EndscreenScene;

/// Scene union - represents the currently active scene
/// 
/// This tagged union ensures type safety and prevents multiple scenes from
/// being active simultaneously. Each variant contains the scene's state and
/// must implement the scene interface (init, deinit, update, draw).
pub const Scene = union(sc.SceneTag) {
    IntroScene: IntroScene,
    GameScene: GameScene,
    EndScene: EndScene,

    /// Initialize the current scene and load its resources
    /// 
    /// This method is called when transitioning to a new scene. It loads
    /// shaders, textures, and other resources needed by the scene.
    /// Errors are logged but don't crash the game.
    pub fn init(self: *Scene) void {
        return switch (self.*) {
            .IntroScene => |*intro| intro.init() catch |e| std.debug.print("Intro Failed to Load {}", .{e}),
            .GameScene => |*game| game.init(),
            .EndScene => |*end| end.init() catch |e| std.debug.print("EndScreen Failed to Load: {}", .{e}),
        };
    }

    /// Clean up scene resources
    /// 
    /// Called when transitioning away from a scene. Frees all resources
    /// (shaders, textures, etc.) to prevent memory leaks.
    pub fn deinit(self: *Scene) void {
        return switch (self.*) {
            .IntroScene => |*intro| intro.deinit(),
            .GameScene => |*game| game.deinit(),
            .EndScene => |*end| end.deinit(),
        };
    }

    /// Update scene logic and check for scene transitions
    /// 
    /// Called every frame with delta time for frame-independent updates.
    /// 
    /// Parameters:
    /// - dt: Delta time in seconds since last frame
    /// 
    /// Returns:
    /// - null: Stay in current scene
    /// - SceneTag: Transition to the specified scene
    pub fn update(self: *Scene, dt: f32) ?sc.SceneTag {
        return switch (self.*) {
            .IntroScene => |*intro| intro.update(dt),
            .GameScene => |*game| game.update(dt),
            .EndScene => |*end| end.update(dt),
        };
    }

    /// Render the current scene
    /// 
    /// Called every frame between beginDrawing() and endDrawing().
    /// Each scene is responsible for drawing its own content.
    pub fn draw(self: *Scene) void {
        switch (self.*) {
            .IntroScene => |*intro| intro.draw(),
            .GameScene => |*game| game.draw(),
            .EndScene => |*end| end.draw(),
        }
    }
};
