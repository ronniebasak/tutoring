const std = @import("std");
const rl = @import("raylib");
const scene_types = @import("scene_types.zig");

const Ball = @import("game/ball.zig").Ball;
const Pipes = @import("game/pipe.zig").Pipes;

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
                // std.debug.print("PIPE XPOS: {}", .{pipe.xpos});
                self.score += 1;
                pipe.scored = true;
            }
        }

        if ((self.ball.pos.y - self.ball.radius <= 0) or (self.ball.pos.y + self.ball.radius >= @as(f32, @floatFromInt(rl.getScreenHeight())))) {
            self.gameover = true;
            return scene_types.SceneTag.EndScene;
        }
        return null;
    }

    pub fn draw(self: *GameplayScene) void {
        rl.clearBackground(.white);
        if (self.gameover) {
            rl.clearBackground(.red);
        }

        self.ball.draw();
        self.pipes.draw();

        var buf: [32]u8 = undefined;
        const score_text = std.fmt.bufPrintZ(&buf, "Score: {}", .{self.score}) catch return;
        rl.drawText(score_text, 10, 10, 25, .red);

        // rl.drawText("Score: 0", 10, 10, 25, .red);
    }
};
