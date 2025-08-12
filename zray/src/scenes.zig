const std = @import("std");
const sc = @import("scenes/scene_types.zig");
const IntroScene = @import("scenes/intro.zig").IntroScene;
const GameScene = @import("scenes/gameplay.zig").GameplayScene;
const EndScene = @import("scenes/endscreen.zig").EndscreenScene;

pub const Scene = union(sc.SceneTag) {
    IntroScene: IntroScene,
    GameScene: GameScene,
    EndScene: EndScene,

    pub fn init(self: *Scene) void {
        return switch (self.*) {
            .IntroScene => |*intro| intro.init() catch |e| std.debug.print("Intro Failed to Load {}", .{e}),
            .GameScene => |*game| game.init(),
            .EndScene => |*end| end.init() catch |e| std.debug.print("EndScreen Failed to Load: {}", .{e}),
        };
    }

    pub fn deinit(self: *Scene) void {
        return switch (self.*) {
            .IntroScene => |*intro| intro.deinit(),
            .GameScene => |*game| game.deinit(),
            .EndScene => |*end| end.deinit(),
        };
    }

    pub fn update(self: *Scene, dt: f32) ?sc.SceneTag {
        return switch (self.*) {
            .IntroScene => |*intro| intro.update(dt),
            .GameScene => |*game| game.update(dt),
            .EndScene => |*end| end.update(dt),
        };
    }

    pub fn draw(self: *Scene) void {
        switch (self.*) {
            .IntroScene => |*intro| intro.draw(),
            .GameScene => |*game| game.draw(),
            .EndScene => |*end| end.draw(),
        }
    }
};
