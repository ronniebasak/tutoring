const rl = @import("raylib");
const scene_types = @import("scene_types.zig");

pub const IntroScene = struct {
    pub fn update(self: *const IntroScene, dt: f32) ?scene_types.SceneTag {
        _ = self;
        _ = dt;

        const key = rl.getKeyPressed();
        if (key == rl.KeyboardKey.space) {
            return scene_types.SceneTag.GameScene;
        }
        return null;
    }

    pub fn draw(self: *const IntroScene) void {
        _ = self;
        rl.clearBackground(.white);

        const screenWidth = rl.getScreenWidth();
        const screenHeight = rl.getScreenHeight();

        // Text you want to draw
        const text1 = "HELLO";
        const text2 = "Press any key to continue";

        const fontSize1: i32 = 50;
        const fontSize2: i32 = 20;

        // Measure widths
        const text1Width = rl.measureText(text1, fontSize1);
        const text2Width = rl.measureText(text2, fontSize2);

        // Calculate centered positions
        const text1X = (screenWidth - text1Width) >> 1;
        const text1Y = (screenHeight >> 1) - fontSize1; // vertical positioning

        const text2X = (screenWidth - text2Width) >> 1;
        const text2Y = text1Y + fontSize1 + 40; // 40px gap below text1

        // Draw
        rl.drawText(text1, text1X, text1Y, fontSize1, .dark_green);
        rl.drawText(text2, text2X, text2Y, fontSize2, .dark_green);
    }
};
