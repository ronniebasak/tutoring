const rl = @import("raylib");
const scene_types = @import("scene_types.zig");

const Ball = @import("game/ball.zig").Ball;
const Pipes = @import("game/pipe.zig").Pipes;

pub const GameplayScene = struct {
    ball: Ball = Ball{ .pos = rl.Vector2.init(250, 300) },
    pipes: Pipes = Pipes{},
    score: u32 = 0,

    pub fn update(self: *GameplayScene, dt: f32) ?scene_types.SceneTag {
        const key = rl.getKeyPressed();
        switch (key) {
            rl.KeyboardKey.space => self.ball.flap(),
            else => {},
        }

        self.pipes.update(dt);
        self.ball.update(dt);

        if (self.ball.pos.x < 0) {
            self.ball.pos.x = 0;
        }

        return null;
    }

    pub fn draw(self: *GameplayScene) void {
        rl.clearBackground(.white);

        self.ball.draw();
        self.pipes.draw();
    }
};
