const std = @import("std");
const rl = @import("raylib");
const scene_types = @import("scene_types.zig");

const Ball = @import("game/ball.zig").Ball;
const Pipes = @import("game/pipe.zig").Pipes;
const Pipe = @import("game/pipe.zig").Pipe;
const Background = @import("game/background.zig").Background;

pub const GameplayScene = struct {
    ball: Ball = Ball{ .pos = rl.Vector2.init(250, 300) },
    pipes: Pipes = Pipes{},
    bg: Background = Background{},
    score: u32 = 0,
    gameover: bool = false,

    pub fn init(self: *GameplayScene) void {
        self.ball.init() catch |e| std.log.err("BALL LOADING ERROR: {}", .{e});
        self.pipes.init() catch |e| std.log.err("PIPES LOADING ERROR: {}", .{e});
        self.bg.init() catch |e| std.log.err("BACKGROUND LOADING ERROR: {}", .{e});
    }

    pub fn deinit(self: *GameplayScene) void {
        self.ball.deinit();
        self.pipes.deinit();
        self.bg.deinit();
    }

    fn check_score(self: *GameplayScene) void {
        for (&self.pipes.pipe_pool.pipes) |*pipe| {
            if (!pipe.scored and @as(f32, @floatFromInt(pipe.xpos + pipe.width)) < (self.ball.pos.x - self.ball.radius)) {
                self.score += 1;
                pipe.scored = true;
            }
        }
    }

    fn check_roof_and_floor_collusion(self: *GameplayScene) bool {
        if ((self.ball.pos.y - self.ball.radius <= 0) or (self.ball.pos.y + self.ball.radius >= @as(f32, @floatFromInt(rl.getScreenHeight())))) {
            return true;
        }
        return false;
    }

    fn get_closest_pipe(self: *GameplayScene) ?*Pipe {
        // pick closest pipe to the right of the ball
        var cpipe: ?*Pipe = null;
        var cdelta: i32 = std.math.maxInt(i32);

        for (&self.pipes.pipe_pool.pipes) |*pipe| {
            const xdelta = pipe.xpos - @as(i32, @intFromFloat(self.ball.pos.x));
            if (xdelta > 0 and xdelta < cdelta) {
                cdelta = xdelta;
                cpipe = pipe;
            }
        }

        return cpipe;
    }

    fn check_pipe_collision(self: *GameplayScene, u_pipe: *Pipe) bool {
        const tx = @as(f32, @floatFromInt(u_pipe.xpos));
        const ty = 0;
        const tw = @as(f32, @floatFromInt(u_pipe.width));
        const th = @as(f32, @floatFromInt(u_pipe.gap));
        const topRec = rl.Rectangle.init(tx, ty, tw, th);

        const bx = @as(f32, @floatFromInt(u_pipe.xpos));
        const by = @as(f32, @floatFromInt(u_pipe.gap + u_pipe.gap_size));
        const bw = @as(f32, @floatFromInt(u_pipe.width));
        const bh: f32 = 700;
        const bottomRec = rl.Rectangle.init(bx, by, bw, bh);

        const tRC = rl.checkCollisionCircleRec(self.ball.pos, self.ball.radius, topRec);
        const bRC = rl.checkCollisionCircleRec(self.ball.pos, self.ball.radius, bottomRec);

        return tRC or bRC;
    }

    pub fn update(self: *GameplayScene, dt: f32) ?scene_types.SceneTag {
        const key = rl.getKeyPressed();
        switch (key) {
            rl.KeyboardKey.space => self.ball.flap(),
            else => {},
        }

        self.bg.update(dt);
        self.pipes.update(dt);
        self.ball.update(dt);

        self.check_score();

        const edge_collision = self.check_roof_and_floor_collusion();
        if (edge_collision) {
            self.gameover = true;
            return scene_types.SceneTag.EndScene;
        }

        const cpipe: ?*Pipe = self.get_closest_pipe();

        if (cpipe) |u_pipe| {
            if (self.check_pipe_collision(u_pipe)) {
                self.gameover = true;
                return scene_types.SceneTag.EndScene;
            }
        }

        return null;
    }

    pub fn draw(self: *GameplayScene) void {
        self.bg.draw();
        self.ball.draw();
        self.pipes.draw();

        var buf: [32]u8 = undefined;
        const score_text = std.fmt.bufPrintZ(&buf, "Score: {}", .{self.score}) catch return;
        rl.drawText(score_text, 10, 10, 25, .red);
    }
};
