const rl = @import("raylib");
const scene_types = @import("scene_types.zig");

pub const EndscreenScene = struct {
    pub fn update(self: *const EndscreenScene, dt: f32) ?scene_types.SceneTag {
        _ = self;
        _ = dt;
        return null;
    }

    pub fn draw(self: *const EndscreenScene) void {
        _ = self;
        rl.clearBackground(.white);
    }
};
