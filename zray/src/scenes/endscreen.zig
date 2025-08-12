const rl = @import("raylib");
const std = @import("std");
const scene_types = @import("scene_types.zig");

pub const EndscreenScene = struct {
    textureA: rl.Texture = undefined,
    timer: f32 = 0.0,

    const IMAGE_ANIM_TIME = 1.0; // seconds to scale and land
    const TEXT1_DELAY = 0.0; // seconds after image anim finishes
    const TEXT2_DELAY = 1.0; // seconds after GAME OVER appears

    pub fn init(self: *EndscreenScene) !void {
        self.* = .{}; // reset all fields
        self.textureA = try rl.loadTexture("res/umadbro.png");
    }

    pub fn deinit(self: *EndscreenScene) void {
        rl.unloadTexture(self.textureA);
    }

    pub fn update(self: *EndscreenScene, dt: f32) ?scene_types.SceneTag {
        self.timer += dt;

        // Spacebar only works after Stage 3
        const readyForInput = self.timer >= (IMAGE_ANIM_TIME + TEXT1_DELAY + TEXT2_DELAY);

        if (readyForInput and rl.isKeyPressed(rl.KeyboardKey.space)) {
            return scene_types.SceneTag.IntroScene;
        }

        return null;
    }

    fn easeOutBack(t: f32) f32 {
        // cubic easing with overshoot
        const c1: f32 = 1.70158;
        const c3 = c1 + 1.0;
        return 1.0 + c3 * std.math.pow(f32, t - 1.0, 3) + c1 * std.math.pow(f32, t - 1.0, 2);
    }

    pub fn draw(self: *const EndscreenScene) void {
        rl.clearBackground(.white);

        const screenWidth = rl.getScreenWidth();
        const screenHeight = rl.getScreenHeight();

        // Stage 1: Image animation
        const imageTime = @min(self.timer / IMAGE_ANIM_TIME, 1.0);
        const scale = if (imageTime < 1.0) easeOutBack(imageTime) else 1.0;

        const imgWidth = @as(f32, @floatFromInt(self.textureA.width)) * scale;
        const imgHeight = @as(f32, @floatFromInt(self.textureA.height)) * scale;

        const imgX = @as(f32, @floatFromInt(screenWidth)) / 2.0 - imgWidth / 2.0;
        const imgY = @as(f32, @floatFromInt(screenHeight)) / 2.0 - imgHeight / 2.0 - 100;

        rl.drawTextureEx(self.textureA, rl.Vector2.init(imgX, imgY), 0.0, scale, .red);

        // Stage 2: Game Over text
        var text1Y: i32 = 0;
        if (self.timer >= IMAGE_ANIM_TIME + TEXT1_DELAY) {
            const text1 = "GAME OVER";
            const fontSize1: i32 = 60;
            const text1Width = rl.measureText(text1, fontSize1);
            const text1X = (screenWidth - text1Width) >> 1;
            text1Y = (screenHeight >> 1) + @as(i32, @intFromFloat(imgHeight / 2)) - 40;
            rl.drawText(text1, text1X, text1Y, fontSize1, .red);
        }

        // Stage 3: Press any key (below Game Over)
        if (self.timer >= IMAGE_ANIM_TIME + TEXT1_DELAY + TEXT2_DELAY) {
            const text2 = "Press SPACE to return to menu";
            const fontSize2: i32 = 20;
            const text2Width = rl.measureText(text2, fontSize2);
            const text2X = (screenWidth - text2Width) >> 1;
            const text2Y = text1Y + 80; // 40px gap below Game Over
            rl.drawText(text2, text2X, text2Y, fontSize2, .dark_gray);
        }
    }
};
