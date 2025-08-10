const rl = @import("raylib");
const scene_types = @import("scene_types.zig");

pub const IntroScene = struct {
    pub fn update(self: *const IntroScene, dt: f32) ?scene_types.SceneTag {
        _ = self;
        _ = dt;

        const key = rl.getKeyPressed();
        switch (key) {
            rl.KeyboardKey.space => return scene_types.SceneTag.GameScene,
            else => {},
        }
        return null;
    }

    pub fn draw(self: *const IntroScene) void {
        _ = self;
        rl.clearBackground(.white);
        rl.drawText("HELLO", 100, 100, 50, .dark_green);
        rl.drawText("Press any key to continue", 50, 400, 20, .dark_green);
    }
};
