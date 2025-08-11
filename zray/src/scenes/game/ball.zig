const std = @import("std");
const rl = @import("raylib");

pub const Ball = struct {
    pos: rl.Vector2 = rl.Vector2.init(100.0, 100.0),
    radius: f32 = 30.0,
    color: rl.Color = .dark_blue,
    flap_boost: f32 = 550.0,
    shader: rl.Shader = undefined,
    time: f32 = 0.0,

    physics: struct {
        gravity: rl.Vector2 = rl.Vector2.init(0, 2000.0),
        velocity: rl.Vector2 = rl.Vector2.init(0, 0),
        // Add velocity smoothing for better visual effects
        smoothed_velocity: rl.Vector2 = rl.Vector2.init(0, 0),
        velocity_history: [5]rl.Vector2 = [_]rl.Vector2{rl.Vector2.init(0, 0)} ** 5,
        history_index: usize = 0,
    } = .{},

    pub fn init(self: *Ball) anyerror!void {
        self.shader = try rl.loadShader("shaders/organic.vert", "shaders/organic.frag");
    }

    pub fn deinit(self: *Ball) void {
        rl.unloadShader(self.shader);
    }

    pub fn flap(self: *Ball) void {
        self.physics.velocity = rl.Vector2.init(0, -self.flap_boost);
    }

    fn updateVelocitySmoothing(self: *Ball) void {
        // Store current velocity in history
        self.physics.velocity_history[self.physics.history_index] = self.physics.velocity;
        self.physics.history_index = (self.physics.history_index + 1) % self.physics.velocity_history.len;

        // Calculate smoothed velocity as average of recent velocities
        var sum = rl.Vector2.init(0, 0);
        for (self.physics.velocity_history) |vel| {
            sum = sum.add(rl.Vector2.init(100, vel.y));
        }
        self.physics.smoothed_velocity = sum.scale(1.0 / @as(f32, @floatFromInt(self.physics.velocity_history.len)));
    }

    pub fn update(self: *Ball, dt: f32) void {
        self.time += dt;

        // Store previous velocity for smoothing
        self.updateVelocitySmoothing();

        // Apply physics
        self.physics.velocity = self.physics.velocity
            .add(self.physics.gravity.scale(dt));

        // Screen bounds
        const screen_w = @as(f32, @floatFromInt(rl.getScreenWidth()));
        const screen_h = @as(f32, @floatFromInt(rl.getScreenHeight()));
        const min_pos = rl.Vector2.init(self.radius, self.radius);
        const max_pos = rl.Vector2.init(screen_w - self.radius, screen_h - self.radius);

        // Update position with bounds clamping
        const new_pos = self.pos.add(self.physics.velocity.scale(dt));
        // const old_pos = self.pos;
        self.pos = new_pos.clamp(min_pos, max_pos);

        // Handle collisions and adjust velocity accordingly
        if (self.pos.x <= self.radius or self.pos.x >= screen_w - self.radius) {
            self.physics.velocity.x *= -0.6; // Bounce with damping
        }
        if (self.pos.y <= self.radius or self.pos.y >= screen_h - self.radius) {
            self.physics.velocity.y *= -0.6; // Bounce with damping
            // Add some randomness to prevent perfect bouncing
            if (self.pos.y >= screen_h - self.radius) {
                self.physics.velocity.x += (std.crypto.random.float(f32) - 0.5) * 100.0;
            }
        }
    }

    pub fn draw(self: *Ball) void {
        rl.beginShaderMode(self.shader);

        // Set shader uniforms
        const time_uniform = rl.getShaderLocation(self.shader, "u_time");
        const radius_uniform = rl.getShaderLocation(self.shader, "u_radius");
        const center_uniform = rl.getShaderLocation(self.shader, "u_center");
        const velocity_uniform = rl.getShaderLocation(self.shader, "u_velocity");

        // Pass time
        rl.setShaderValue(self.shader, time_uniform, &[_]f32{self.time}, rl.ShaderUniformDataType.float);

        // Pass radius
        rl.setShaderValue(self.shader, radius_uniform, &[_]f32{self.radius}, rl.ShaderUniformDataType.float);

        // Pass center position (convert to shader coordinate system)
        const screen_h = @as(f32, @floatFromInt(rl.getScreenHeight()));
        const shader_center = [_]f32{ self.pos.x, screen_h - self.pos.y };
        rl.setShaderValue(self.shader, center_uniform, &shader_center, rl.ShaderUniformDataType.vec2);

        // Pass smoothed velocity for better visual effects
        // Invert Y velocity to match shader coordinate system
        const shader_velocity = [_]f32{ self.physics.smoothed_velocity.x, -self.physics.smoothed_velocity.y };
        rl.setShaderValue(self.shader, velocity_uniform, &shader_velocity, rl.ShaderUniformDataType.vec2);

        // Draw a fullscreen rect — shader will decide what's visible
        rl.drawRectangle(0, 0, rl.getScreenWidth(), rl.getScreenHeight(), self.color);

        rl.endShaderMode();

        // Optional: Draw debug velocity vector
        // Uncomment the following lines to visualize velocity

        // const vel_scale: f32 = 0.1;
        // const vel_end = self.pos.add(self.physics.velocity.scale(vel_scale));
        // rl.drawLineEx(self.pos, vel_end, 2.0, .red);
        // rl.drawCircleV(vel_end, 3.0, .red);

    }
};
