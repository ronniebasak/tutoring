const std = @import("std");
const rl = @import("raylib");

pub const Ball = struct {
    pos: rl.Vector2 = rl.Vector2.init(100.0, 100.0),
    radius: f32 = 30.0,
    color: rl.Color = .dark_blue,
    flap_boost: f32 = 550.0,

    shader: rl.Shader = undefined,
    time: f32 = 0.0,

    physics: struct {
        gravity: rl.Vector2 = rl.Vector2.init(0, 2000.0),
        velocity: rl.Vector2 = rl.Vector2.init(0, 0),
    } = .{},

    pub fn init(self: *Ball) anyerror!void {
        self.shader = try rl.loadShader("shaders/organic.vert", "shaders/organic.frag");
    }

    pub fn deinit(self: *Ball) void {
        rl.unloadShader(self.shader);
    }

    pub fn flap(self: *Ball) void {
        self.physics.velocity = rl.Vector2.init(0, -self.flap_boost);
    }

    pub fn update(self: *Ball, dt: f32) void {
        self.time += dt;

        self.physics.velocity = self.physics.velocity
            .add(self.physics.gravity.scale(dt));

        const screen_w = @as(f32, @floatFromInt(rl.getScreenWidth()));
        const screen_h = @as(f32, @floatFromInt(rl.getScreenHeight()));
        const min_pos = rl.Vector2.init(self.radius, self.radius);
        const max_pos = rl.Vector2.init(screen_w - self.radius, screen_h - self.radius);

        self.pos = self.pos
            .add(self.physics.velocity.scale(dt))
            .clamp(min_pos, max_pos);
    }

    pub fn draw(self: *Ball) void {
        rl.beginShaderMode(self.shader);
        rl.setShaderValue(self.shader, rl.getShaderLocation(self.shader, "u_time"), &[_]f32{self.time}, rl.ShaderUniformDataType.float);
        rl.setShaderValue(self.shader, rl.getShaderLocation(self.shader, "u_radius"), &[_]f32{self.radius}, rl.ShaderUniformDataType.float);
        rl.setShaderValue(self.shader, rl.getShaderLocation(self.shader, "u_center"), &[_]f32{ self.pos.x, @as(f32, @floatFromInt(rl.getScreenHeight())) - self.pos.y }, rl.ShaderUniformDataType.vec2);

        // Draw a fullscreen rect — shader will decide what’s visible
        rl.drawRectangle(0, 0, rl.getScreenWidth(), rl.getScreenHeight(), self.color);

        rl.endShaderMode();

        // rl.drawCircleV(self.pos, self.radius, .green);
    }
};
