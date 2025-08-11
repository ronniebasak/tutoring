const std = @import("std");
const rl = @import("raylib");
const PIPE_SPEED = @import("pipe.zig").PIPE_SPEED;

pub const Ball = struct {
    pos: rl.Vector2 = rl.Vector2.init(100.0, 100.0),
    radius: f32 = 30.0,
    color: rl.Color = .dark_blue,
    flap_boost: f32 = 550.0,
    shader: rl.Shader = undefined,
    time: f32 = 0.0,

    // Trail system
    trail: struct {
        points: [20]rl.Vector2 = [_]rl.Vector2{rl.Vector2.init(0, 0)} ** 20,
        ages: [20]f32 = [_]f32{0.0} ** 20,
        current_index: usize = 0,
        update_timer: f32 = 0.0,
        update_interval: f32 = 0.02, // Add new trail point every 20ms
    } = .{},

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

        // Initialize trail points to current position
        for (&self.trail.points) |*point| {
            point.* = self.pos;
        }
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

    fn updateTrail(self: *Ball, dt: f32) void {
        self.trail.update_timer += dt;

        // Age all trail points and move them back to simulate world movement
        for (&self.trail.points, &self.trail.ages) |*point, *age| {
            // Move trail points backward to simulate world movement
            point.x -= PIPE_SPEED * dt;
            age.* += dt;
        }

        // Add new trail point periodically
        if (self.trail.update_timer >= self.trail.update_interval) {
            self.trail.update_timer = 0.0;

            // Add current position to trail
            self.trail.points[self.trail.current_index] = self.pos;
            self.trail.ages[self.trail.current_index] = 0.0;
            self.trail.current_index = (self.trail.current_index + 1) % self.trail.points.len;
        }
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

        // Update trail system
        self.updateTrail(dt);
    }

    pub fn draw(self: *Ball) void {
        rl.beginShaderMode(self.shader);

        // Set shader uniforms
        const time_uniform = rl.getShaderLocation(self.shader, "u_time");
        const radius_uniform = rl.getShaderLocation(self.shader, "u_radius");
        const center_uniform = rl.getShaderLocation(self.shader, "u_center");
        const velocity_uniform = rl.getShaderLocation(self.shader, "u_velocity");
        const trail_uniform = rl.getShaderLocation(self.shader, "u_trail_points");
        const trail_count_uniform = rl.getShaderLocation(self.shader, "u_trail_count");

        // Pass time
        rl.setShaderValue(self.shader, time_uniform, &[_]f32{self.time}, rl.ShaderUniformDataType.float);

        // Pass radius
        rl.setShaderValue(self.shader, radius_uniform, &[_]f32{self.radius}, rl.ShaderUniformDataType.float);

        // Pass center position (convert to shader coordinate system)
        const screen_h = @as(f32, @floatFromInt(rl.getScreenHeight()));
        const shader_center = [_]f32{ self.pos.x, screen_h - self.pos.y };
        rl.setShaderValue(self.shader, center_uniform, &shader_center, rl.ShaderUniformDataType.vec2);

        // Pass smoothed velocity for better visual effects
        const shader_velocity = [_]f32{ self.physics.smoothed_velocity.x, -self.physics.smoothed_velocity.y };
        rl.setShaderValue(self.shader, velocity_uniform, &shader_velocity, rl.ShaderUniformDataType.vec2);

        // FIXED: Prepare trail data in correct order (newest to oldest)
        var trail_data: [40]f32 = undefined; // 20 points * 2 components each
        var valid_trail_count: i32 = 0;

        // Start from the most recent point and work backwards
        for (0..self.trail.points.len) |i| {
            // Calculate the actual index in the circular buffer
            // Most recent is at (current_index - 1), then (current_index - 2), etc.
            const actual_index = (self.trail.current_index + self.trail.points.len - 1 - i) % self.trail.points.len;
            const point = self.trail.points[actual_index];
            const age = self.trail.ages[actual_index];

            // Only include points that are still on screen and not too old
            if (point.x > -50.0 and age < 1.0) { // 1 second max trail age
                trail_data[i * 2] = point.x;
                trail_data[i * 2 + 1] = screen_h - point.y; // Convert to shader coords
                valid_trail_count += 1;
            } else {
                trail_data[i * 2] = -1000.0; // Mark as invalid
                trail_data[i * 2 + 1] = -1000.0;
            }
        }

        // Pass trail data to shader
        rl.setShaderValueV(self.shader, trail_uniform, &trail_data, rl.ShaderUniformDataType.vec2, @intCast(self.trail.points.len));
        rl.setShaderValue(self.shader, trail_count_uniform, &[_]i32{valid_trail_count}, rl.ShaderUniformDataType.int);

        // Draw a fullscreen rect — shader will decide what's visible
        rl.drawRectangle(0, 0, rl.getScreenWidth(), rl.getScreenHeight(), self.color);

        rl.endShaderMode();

        // Optional: Draw debug trail points to verify ordering
        // Uncomment for debugging trail order
        // for (0..self.trail.points.len) |i| {
        //     const actual_index = (self.trail.current_index + self.trail.points.len - 1 - i) % self.trail.points.len;
        //     const point = self.trail.points[actual_index];
        //     const age = self.trail.ages[actual_index];
        //
        //     if (point.x > -50.0 and age < 1.0) {
        //         const alpha = 1.0 - (age / 1.0);
        //         const size = 8.0 - (@as(f32, @floatFromInt(i)) / @as(f32, @floatFromInt(self.trail.points.len))) * 5.0;
        //         const debug_color = rl.Color.init(255, @intFromFloat(255.0 * (@as(f32, @floatFromInt(i)) / 20.0)), 0, @intFromFloat(255.0 * alpha));
        //         rl.drawCircleV(point, size, debug_color);
        //     }
        // }
    }
};
