const rl = @import("raylib");
const scene_types = @import("scene_types.zig");

pub const EndscreenScene = struct {
    pub fn init(self: *EndscreenScene) void {
        _ = self;
    }
    pub fn deinit(self: *EndscreenScene) void {
        _ = self;
    }

    pub fn update(self: *const EndscreenScene, dt: f32) ?scene_types.SceneTag {
        _ = self;
        _ = dt;

        const key = rl.getKeyPressed();
        if (key == rl.KeyboardKey.space) {
            return scene_types.SceneTag.IntroScene; // or whatever menu scene tag you use
        }

        return null;
    }

    pub fn draw(self: *const EndscreenScene) void {
        _ = self;
        rl.clearBackground(.white);

        const screenWidth = rl.getScreenWidth();
        const screenHeight = rl.getScreenHeight();

        const text1 = "GAME OVER";
        const text2 = "Press any key to return to menu";

        const fontSize1: i32 = 60;
        const fontSize2: i32 = 20;

        const text1Width = rl.measureText(text1, fontSize1);
        const text2Width = rl.measureText(text2, fontSize2);

        const text1X = (screenWidth - text1Width) >> 1;
        const text1Y = (screenHeight >> 1) - fontSize1;

        const text2X = (screenWidth - text2Width) >> 1;
        const text2Y = text1Y + fontSize1 + 40;

        rl.drawText(text1, text1X, text1Y, fontSize1, .red);
        rl.drawText(text2, text2X, text2Y, fontSize2, .dark_gray);
    }
};
