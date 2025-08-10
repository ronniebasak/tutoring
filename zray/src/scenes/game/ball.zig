const rl = @import("raylib");

pub const Ball = struct {
    pos: rl.Vector2 = rl.Vector2.init(100.0, 100.0),
    radius: f32 = 20.0,
    color: rl.Color = rl.Color.dark_green,
    flap_boost: f32 = 300.0,

    physics: struct {
        gravity: rl.Vector2 = rl.Vector2.init(0, 850.0),
        velocity: rl.Vector2 = rl.Vector2.init(0, 0),
    } = .{},

    pub fn flap(self: *Ball) void {
        self.physics.velocity = rl.Vector2.init(0, -self.flap_boost);
    }

    pub fn update(self: *Ball, dt: f32) void {
        self.physics.velocity = self.physics.velocity
            .add(self.physics.gravity.scale(dt));

        const screen_w = @as(f32, @floatFromInt(rl.getScreenWidth()));
        const screen_h = @as(f32, @floatFromInt(rl.getScreenHeight()));
        const min_pos = rl.Vector2.init(self.radius, self.radius);
        const max_pos = rl.Vector2.init(screen_w - self.radius, screen_h - self.radius);

        self.pos = self.pos
            .add(self.physics.velocity.scale(@as(f32, dt)))
            .clamp(min_pos, max_pos);
    }

    pub fn draw(self: *Ball) void {
        rl.drawCircle(@intFromFloat(self.pos.x), @intFromFloat(self.pos.y), self.radius, self.color);
    }
};
