const std = @import("std");
const rl = @import("raylib");
const PIPE_SPEED = @import("pipe.zig").PIPE_SPEED;

pub const Background = struct {
    time: f32 = 0.0,
    pipe_speed: i32 = PIPE_SPEED,
    shader: rl.Shader = undefined,

    pub fn init(self: *Background) anyerror!void {
        self.shader = try rl.loadShader("shaders/background.vert", "shaders/background.frag");
    }

    pub fn deinit(self: *Background) void {
        rl.unloadShader(self.shader);
    }

    pub fn update(self: *Background, dt: f32) void {
        self.time += dt;
    }

    pub fn draw(self: *Background) void {
        rl.beginShaderMode(self.shader);

        // Set shader uniforms
        const time_uniform = rl.getShaderLocation(self.shader, "u_time");
        const resolution_uniform = rl.getShaderLocation(self.shader, "u_resolution");
        const pipe_speed_uniform = rl.getShaderLocation(self.shader, "u_pipe_speed");

        // Pass time
        rl.setShaderValue(self.shader, time_uniform, &[_]f32{self.time}, rl.ShaderUniformDataType.float);

        // Pass screen resolution
        const resolution = [_]f32{ @as(f32, @floatFromInt(rl.getScreenWidth())), @as(f32, @floatFromInt(rl.getScreenHeight())) };
        rl.setShaderValue(self.shader, resolution_uniform, &resolution, rl.ShaderUniformDataType.vec2);

        // Pass pipe speed for parallax sync
        rl.setShaderValue(self.shader, pipe_speed_uniform, &[_]f32{@as(f32, @floatFromInt(-self.pipe_speed))}, rl.ShaderUniformDataType.float);

        // Draw fullscreen quad
        rl.drawRectangle(0, 0, rl.getScreenWidth(), rl.getScreenHeight(), rl.Color.white);

        rl.endShaderMode();
    }
};
