const std = @import("std");
const rl = @import("raylib");
const scene_types = @import("scene_types.zig");

const Ball = @import("game/ball.zig").Ball;
const Pipes = @import("game/pipe.zig").Pipes;
const Pipe = @import("game/pipe.zig").Pipe;

pub const GameplayScene = struct {
    ball: Ball = Ball{ .pos = rl.Vector2.init(250, 300) },
    pipes: Pipes = Pipes{},
    score: u32 = 0,
    gameover: bool = false,

    pub fn update(self: *GameplayScene, dt: f32) ?scene_types.SceneTag {
        const key = rl.getKeyPressed();
        switch (key) {
            rl.KeyboardKey.space => self.ball.flap(),
            else => {},
        }

        self.pipes.update(dt);
        self.ball.update(dt);

        for (&self.pipes.pipe_pool.pipes) |*pipe| {
            if (!pipe.scored and @as(f32, @floatFromInt(pipe.xpos + pipe.width)) < (self.ball.pos.x - self.ball.radius)) {
                self.score += 1;
                pipe.scored = true;
            }
        }

        if ((self.ball.pos.y - self.ball.radius <= 0) or (self.ball.pos.y + self.ball.radius >= @as(f32, @floatFromInt(rl.getScreenHeight())))) {
            self.gameover = true;
            return scene_types.SceneTag.EndScene;
        }

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

        if (cpipe) |u_pipe| {
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

            if (tRC or bRC) {
                return scene_types.SceneTag.EndScene;
            }
        }

        return null;
    }

    pub fn draw(self: *GameplayScene) void {
        rl.clearBackground(.white);
        // if (self.gameover) {
        //     rl.clearBackground(.red);
        // }

        self.ball.draw();
        self.pipes.draw();

        var buf: [32]u8 = undefined;
        const score_text = std.fmt.bufPrintZ(&buf, "Score: {}", .{self.score}) catch return;
        rl.drawText(score_text, 10, 10, 25, .red);

        // rl.drawText("Score: 0", 10, 10, 25, .red);
    }
};
