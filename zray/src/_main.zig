const rl = @import("raylib");
const std = @import("std");

const Ball = struct {
    pos: rl.Vector2 = rl.Vector2.init(100.0, 100.0),
    radius: f32 = 20.0,
    color: rl.Color = rl.Color.dark_green,
    flap_boost: f32 = 250.0,

    physics: struct {
        gravity: rl.Vector2 = rl.Vector2.init(0, 500.0),
        velocity: rl.Vector2 = rl.Vector2.init(0, 0),
    } = .{},

    fn flap(self: *Ball) void {
        self.physics.velocity = rl.Vector2.init(0, -self.flap_boost);
    }

    pub fn update(self: *Ball, dt: f32) void {
        self.physics.velocity = self.physics.velocity.add(self.physics.gravity.scale(dt));
        self.pos = self.pos.add(self.physics.velocity.scale(dt));
    }

    pub fn draw(self: *Ball) void {
        rl.drawCircle(@intFromFloat(self.pos.x), @intFromFloat(self.pos.y), self.radius, self.color);
    }
};

pub fn main() anyerror!void {
    // Initialization
    //--------------------------------------------------------------------------------------
    const screenWidth: i32 = 360;
    const screenHeight: i32 = 640;

    // rl.setConfigFlags(rl.ConfigFlags{ .fullscreen_mode = true });
    rl.setConfigFlags(rl.ConfigFlags{
        .window_resizable = true,
        .msaa_4x_hint = false,
    });
    rl.initWindow(screenWidth, screenHeight, "raylib-zig [core] example - basic window");
    defer rl.closeWindow(); // Close window and OpenGL context
    rl.setTargetFPS(120); // Set our game to run at 60 frames-per-second

    var ball = Ball{};

    // Main game loop
    while (!rl.windowShouldClose()) { // Detect window close button or ESC key

        const key = rl.getKeyPressed();
        switch (key) {
            rl.KeyboardKey.space => ball.flap(),
            else => {},
        }

        // Update
        //----------------------------------------------------------------------------------
        //
        const dt = rl.getFrameTime();
        ball.update(dt);

        // Draw
        //----------------------------------------------------------------------------------
        //
        rl.beginDrawing();
        defer rl.endDrawing();

        // rl.drawRectangle(0, 0, hsW, hsH, rl.Color.green);
        rl.clearBackground(.white);
        ball.draw();
        //----------------------------------------------------------------------------------
    }
}
