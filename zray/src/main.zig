const rl = @import("raylib");
const std = @import("std");
const scenes = @import("scenes.zig");
const scene_types = @import("scenes/scene_types.zig");

pub fn main() anyerror!void {
    // Initialization
    //--------------------------------------------------------------------------------------
    const screenWidth: i32 = 1000;
    const screenHeight: i32 = 700;

    // rl.setConfigFlags(rl.ConfigFlags{ .fullscreen_mode = true });
    rl.setConfigFlags(rl.ConfigFlags{
        .window_resizable = true,
        .msaa_4x_hint = false,
    });
    rl.initWindow(screenWidth, screenHeight, "raylib-zig [core] example - basic window");
    defer rl.closeWindow(); // Close window and OpenGL context
    rl.setTargetFPS(120); // Set our game to run at 60 frames-per-second

    var current_scene = scenes.Scene{ .IntroScene = .{} };

    // Main game loop
    while (!rl.windowShouldClose()) { // Detect window close button or ESC key

        const dt = rl.getFrameTime();
        const ns = current_scene.update(dt);

        if (ns) |unwrapped_ns| {
            switch (unwrapped_ns) {
                scene_types.SceneTag.GameScene => {
                    current_scene = scenes.Scene{ .GameScene = .{} };
                },
                else => {},
            }
        }

        rl.beginDrawing();
        defer rl.endDrawing();

        rl.clearBackground(.white);
        current_scene.draw();
    }
}
