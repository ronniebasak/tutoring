const rl = @import("raylib");
const std = @import("std");
const TOTAL_PIPES = 7;
pub const PIPE_SPEED = 700;
const PIPE_SPAWN_DELAY: f64 = 0.8;

pub const Pipe = struct {
    gap: i32 = 150, // vertical location gap in the pipe
    gap_size: i32 = 150, // height of gap from top
    width: i32 = 50, // width of pipe
    xpos: i32 = 2000, // x position of pipe
    color: rl.Color = .dark_green,
    active: bool = false,
    scored: bool = false,
    shader: rl.Shader = undefined,
    time: f32 = 0.0,

    pub fn init(self: *Pipe) anyerror!void {
        self.shader = try rl.loadShader("shaders/pipe_organic.vert", "shaders/pipe_organic.frag");
    }

    pub fn deinit(self: *Pipe) void {
        rl.unloadShader(self.shader);
    }

    pub fn spawn(self: *Pipe) void {
        self.xpos = rl.getScreenWidth() + self.width + 5;
        var prng = std.crypto.random;
        const rnd = prng.intRangeAtMost(i32, 50, rl.getScreenHeight() - 50 - self.gap_size);
        self.gap = rnd;
        self.active = true;
        self.scored = false;
    }

    pub fn despawn(self: *Pipe) void {
        self.xpos = 1000;
        self.active = false;
        self.scored = false;
    }

    pub fn update(self: *Pipe, dt: f32) void {
        if (self.active) {
            self.time += dt;
            self.xpos -= @intFromFloat(PIPE_SPEED * dt);
            if (self.xpos < -self.width) {
                self.despawn();
            }
        }
    }

    pub fn draw(self: *Pipe) void {
        if (!self.active) return;

        rl.beginShaderMode(self.shader);

        // Set shader uniforms
        rl.setShaderValue(self.shader, rl.getShaderLocation(self.shader, "u_time"), &[_]f32{self.time}, rl.ShaderUniformDataType.float);
        rl.setShaderValue(self.shader, rl.getShaderLocation(self.shader, "u_pipe_x"), &[_]f32{@floatFromInt(self.xpos)}, rl.ShaderUniformDataType.float);
        rl.setShaderValue(self.shader, rl.getShaderLocation(self.shader, "u_pipe_width"), &[_]f32{@floatFromInt(self.width)}, rl.ShaderUniformDataType.float);
        rl.setShaderValue(self.shader, rl.getShaderLocation(self.shader, "u_gap_start"), &[_]f32{@floatFromInt(self.gap)}, rl.ShaderUniformDataType.float);
        rl.setShaderValue(self.shader, rl.getShaderLocation(self.shader, "u_gap_size"), &[_]f32{@floatFromInt(self.gap_size)}, rl.ShaderUniformDataType.float);
        rl.setShaderValue(self.shader, rl.getShaderLocation(self.shader, "u_screen_height"), &[_]f32{@floatFromInt(rl.getScreenHeight())}, rl.ShaderUniformDataType.float);

        // Choose color based on scored state
        const pipe_color = if (!self.scored) self.color else rl.Color.red;

        // Draw fullscreen rect - shader will determine what's visible
        rl.drawRectangle(0, 0, rl.getScreenWidth(), rl.getScreenHeight(), pipe_color);

        rl.endShaderMode();
    }
};

const PipePoolManager = struct {
    pipes: [TOTAL_PIPES]Pipe = [TOTAL_PIPES]Pipe{ .{}, .{}, .{}, .{}, .{}, .{}, .{} },

    pub fn init(self: *PipePoolManager) anyerror!void {
        for (&self.pipes) |*pipe| {
            try pipe.init();
        }
    }

    pub fn deinit(self: *PipePoolManager) void {
        for (&self.pipes) |*pipe| {
            pipe.deinit();
        }
    }

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

    pub fn init(self: *Pipes) anyerror!void {
        try self.pipe_pool.init();
    }

    pub fn deinit(self: *Pipes) void {
        self.pipe_pool.deinit();
    }

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
            pipe.draw();
        }
    }
};
