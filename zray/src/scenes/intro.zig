const rl = @import("raylib");
const scene_types = @import("scene_types.zig");
pub const IntroScene = struct {
    textureA: rl.Texture = undefined,
    pub fn init(self: *IntroScene) !void {
        self.* = .{}; // Reset
        self.textureA = try rl.loadTexture("res/umadbro.png");
    }
    pub fn deinit(self: *IntroScene) void {
        rl.unloadTexture(self.textureA);
    }
    pub fn update(self: *const IntroScene, dt: f32) ?scene_types.SceneTag {
        _ = dt;
        _ = self;
        // Spacebar starts the game
        const key = rl.getKeyPressed();
        if (key == rl.KeyboardKey.space) {
            return scene_types.SceneTag.GameScene;
        }
        return null;
    }
    pub fn draw(self: *const IntroScene) void {
        rl.clearBackground(.white);
        const screenWidth = rl.getScreenWidth();
        // Animation timing
        const t = @as(f32, @floatCast(rl.getTime()));
        // Idle bobbing & rotation
        const bobOffset = @sin(t * 2.0) * 10.0; // up-down amplitude 10px
        const rot = @sin(t * 1.5) * 5.0; // rotation ±5 degrees
        // --- Desaturated high brightness color ---
        const hue = @mod(t * 60.0, 360.0); // hue cycles 60° per second
        const saturation: f32 = 0.3; // Low saturation (desaturated)
        const lightness: f32 = 0.8; // High brightness/lightness
        const pastelColor = hslToColor(hue, saturation, lightness);
        // --- Draw centered trollface image ---
        const imgScale: f32 = 0.85;
        const imgWidth = @as(f32, @floatFromInt(self.textureA.width)) * imgScale;
        const imgHeight = @as(f32, @floatFromInt(self.textureA.height)) * imgScale;
        const imgX = @as(f32, @floatFromInt(screenWidth)) / 2.0;
        const imgY = 100.0 + bobOffset; // apply bobbing
        rl.drawTextureEx(
            self.textureA,
            rl.Vector2.init(imgX - imgWidth / 2.0, imgY),
            rot,
            imgScale,
            pastelColor,
        );
        // --- Text content ---
        const text1 = "U MAD BRO?";
        const text2 = "FLAP to get even madderrrr";
        const text3 = "Press SPACE to start";
        const fontSize1: i32 = 50;
        const fontSize2: i32 = 25;
        const fontSize3: i32 = 20;
        const text1Width = rl.measureText(text1, fontSize1);
        const text1X = (screenWidth - text1Width) >> 1;
        const text1Y = @as(i32, @intFromFloat(imgY + imgHeight + 40));
        rl.drawText(text1, text1X, text1Y, fontSize1, .dark_green);
        const text2Width = rl.measureText(text2, fontSize2);
        const text2X = (screenWidth - text2Width) >> 1;
        const text2Y = text1Y + fontSize1 + 10;
        rl.drawText(text2, text2X, text2Y, fontSize2, .dark_green);
        const text3Width = rl.measureText(text3, fontSize3);
        const text3X = (screenWidth - text3Width) >> 1;
        const text3Y = text2Y + fontSize2 + 40;
        rl.drawText(text3, text3X, text3Y, fontSize3, .dark_green);
    }
    // Convert HSL to Raylib Color
    fn hslToColor(h: f32, s: f32, l: f32) rl.Color {
        const c = (1.0 - @abs(2.0 * l - 1.0)) * s;
        const hp = h / 60.0;
        const x = c * (1.0 - @abs(@mod(hp, 2.0) - 1.0));
        var r: f32 = 0;
        var g: f32 = 0;
        var b: f32 = 0;
        if (hp < 1.0) {
            r = c;
            g = x;
            b = 0;
        } else if (hp < 2.0) {
            r = x;
            g = c;
            b = 0;
        } else if (hp < 3.0) {
            r = 0;
            g = c;
            b = x;
        } else if (hp < 4.0) {
            r = 0;
            g = x;
            b = c;
        } else if (hp < 5.0) {
            r = x;
            g = 0;
            b = c;
        } else {
            r = c;
            g = 0;
            b = x;
        }
        const m = l - c / 2.0;
        r += m;
        g += m;
        b += m;
        return rl.Color.init(@as(u8, @intFromFloat(r * 255.0)), @as(u8, @intFromFloat(g * 255.0)), @as(u8, @intFromFloat(b * 255.0)), 255);
    }
};
