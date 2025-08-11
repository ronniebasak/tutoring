const std = @import("std");
const rl = @import("raylib");
const PIPE_SPEED = @import("pipe.zig").PIPE_SPEED;

pub const Background = struct {
    time: f32 = 0.0,
    pipe_speed: i32 = PIPE_SPEED,

    pub fn init(self: *Background) anyerror!void {
        _ = self;
    }

    pub fn deinit(self: *Background) void {
        _ = self;
    }

    pub fn update(self: *Background, dt: f32) void {
        self.time += dt;
    }

    pub fn draw(self: *Background) void {
        _ = self;

        rl.clearBackground(rl.Color.dark_green);
    }
};
