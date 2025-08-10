const rl = @import("raylib");
const std = @import("std");

const TOTAL_PIPES = 7;
const PIPE_SPAWN_X_OFFSET = 350;
const PIPE_TRIGGER_X_OFFSET = 20;
const PIPE_GAP_MS = 400;
const PIPE_SPEED = 500;
const PIPE_SPAWN_DELAY: f64 = 1.5;

pub const Pipe = struct {
    gap: i32 = 200, // vertical location gap in the pipe
    gap_size: i32 = 150, // height of gap from top
    width: i32 = 30, // width of pipe
    xpos: i32 = -100, // x position of pipe
    color: rl.Color = .pink,
    active: bool = false,
    scored: bool = false,

    pub fn spawn(self: *Pipe) void {
        self.xpos = rl.getScreenWidth() + self.width + 5;

        var prng = std.crypto.random;

        const rnd = prng.intRangeAtMost(i32, 50, rl.getScreenHeight() - 50 - self.gap_size);

        self.gap = rnd;
        self.active = true;
        self.scored = false;
    }

    pub fn update(self: *Pipe, dt: f32) void {
        // _ = self;
        // _ = dt;
        if (self.active) {
            self.xpos -= @intFromFloat(PIPE_SPEED * dt);

            if (self.xpos < -self.width) {
                self.active = false;
            }
        }
    }

    pub fn draw(self: *Pipe) void {
        // rl.drawCircle(@intFromFloat(self.pos.x), @intFromFloat(self.pos.y), self.radius, self.color);
        rl.drawRectangle(self.xpos, 0, self.width, self.gap, rl.Color.dark_brown);
        rl.drawRectangle(self.xpos, self.gap + self.gap_size, self.width, 700, self.color);
    }
};

const PipePoolManager = struct {
    pipes: [TOTAL_PIPES]Pipe = [TOTAL_PIPES]Pipe{ .{}, .{}, .{}, .{}, .{}, .{}, .{} },

    pub fn getPipe(self: *PipePoolManager) ?*Pipe {
        for (&self.pipes) |*pipe| {
            if (!pipe.active) {
                return pipe;
            }
        }

        return null;
    }
};

pub const Pipes = struct {
    pipe_pool: PipePoolManager = PipePoolManager{},
    start_time: f64 = -1,
    last_pipe_active: f64 = -1,

    pub fn update(self: *Pipes, dt: f32) void {
        if (self.start_time == -1) {
            self.start_time = rl.getTime();
        }

        // no pipes, init
        if (self.last_pipe_active == -1) {
            const pipe = self.pipe_pool.getPipe();

            if (pipe) |unwrapped_pipe| {
                unwrapped_pipe.spawn();
                self.last_pipe_active = rl.getTime();
            }
        } else {
            if (rl.getTime() - self.last_pipe_active >= PIPE_SPAWN_DELAY) {
                // std.debug.print("WHATTTT", .{});
                const pipe = self.pipe_pool.getPipe();

                if (pipe) |unwrapped_pipe| {
                    unwrapped_pipe.spawn();
                    self.last_pipe_active = rl.getTime();
                }
            }
        }

        for (&self.pipe_pool.pipes) |*pipe| {
            if (pipe.active) {
                pipe.update(dt);
            }
        }
    }

    pub fn draw(self: *Pipes) void {
        for (&self.pipe_pool.pipes) |*pipe| {
            if (pipe.active) {
                pipe.draw();
            }
        }
    }
};
