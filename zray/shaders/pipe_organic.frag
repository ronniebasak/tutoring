#version 330

in vec2 fragTexCoord;
in vec4 fragColor;

uniform float u_time;
uniform float u_pipe_x;
uniform float u_pipe_width;
uniform float u_gap_start;
uniform float u_gap_size;
uniform float u_screen_height;

out vec4 finalColor;

// Smooth noise function for organic movement
float noise(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float smoothNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    float a = noise(i);
    float b = noise(i + vec2(1.0, 0.0));
    float c = noise(i + vec2(0.0, 1.0));
    float d = noise(i + vec2(1.0, 1.0));

    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// Fractal noise for organic texture
float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;

    for (int i = 0; i < 4; i++) {
        value += amplitude * smoothNoise(p * frequency);
        amplitude *= 0.5;
        frequency *= 2.0;
    }

    return value;
}

void main() {
    vec2 pos = vec2(gl_FragCoord.x, u_screen_height - gl_FragCoord.y);

    // Create organic pipe edges with animated distortion
    float time_slow = u_time * 0.3;
    float time_fast = u_time * 1.5;

    // Organic edge distortion - smoother for cohesive look
    float edge_noise = fbm(vec2(pos.y * 0.008 + time_slow, time_fast)) * 8.0;
    float micro_noise = fbm(vec2(pos.y * 0.03, time_fast * 2.0)) * 3.0;
    float total_distortion = edge_noise + micro_noise;

    // Calculate pipe boundaries with organic edges
    float left_edge = u_pipe_x - u_pipe_width * 0.5 + total_distortion;
    float right_edge = u_pipe_x + u_pipe_width * 0.5 - total_distortion;

    // Gap boundaries
    float gap_top = u_gap_start;
    float gap_bottom = u_gap_start + u_gap_size;

    // Check if we're inside the pipe area (but not in the gap)
    bool in_pipe_x = pos.x >= left_edge && pos.x <= right_edge;
    bool in_gap = pos.y >= gap_top && pos.y <= gap_bottom;
    bool in_pipe = in_pipe_x && !in_gap;

    // Check if we're in the top or bottom border areas
    bool in_top_border = pos.y <= 20.0;
    bool in_bottom_border = pos.y >= u_screen_height - 20.0;

    // Check if we're near pipe edges for moss/vine effect
    float dist_from_left = pos.x - left_edge;
    float dist_from_right = right_edge - pos.x;
    float dist_from_pipe_edge = min(dist_from_left, dist_from_right);

    // Soft moss/vine extending from pipes
    float moss_distance = 20.0; // How far moss extends from pipe
    bool in_moss = in_pipe_x && !in_gap && dist_from_pipe_edge < 0.0 && dist_from_pipe_edge > -moss_distance;

    if (in_pipe) {
        // Create natural forest/teal pipe texture
        vec2 pipe_uv = vec2(pos.x * 0.01, pos.y * 0.01);
        float texture_noise = fbm(pipe_uv + time_slow * 0.2);

        // Natural growth patterns
        float growth_pattern = sin(pos.y * 0.06 + time_slow * 1.5) * 0.5 + 0.5;
        float moss_pattern = fbm(vec2(pos.x * 0.02, pos.y * 0.02 + time_slow * 0.3));
        float bark_pattern = fbm(vec2(pos.x * 0.015, pos.y * 0.015 + time_slow * 0.2));

        // Forest green and teal colors (#2d5a3d and #1a4a4a)
        vec3 forest_base = vec3(0.176, 0.353, 0.239); // #2d5a3d
        vec3 teal_base = vec3(0.102, 0.29, 0.29); // #1a4a4a
        vec3 moss_color = vec3(0.25, 0.45, 0.3); // Lighter moss green
        vec3 bark_color = vec3(0.15, 0.25, 0.2); // Dark bark
        vec3 highlight = vec3(0.35, 0.55, 0.45); // Soft green highlight
        vec3 shadow = vec3(0.05, 0.15, 0.12); // Deep forest shadow
        vec3 depth_color = vec3(0.08, 0.2, 0.18); // Deep interior color

        // Mix colors for natural, forest appearance
        vec3 pipe_color = mix(forest_base, teal_base, texture_noise * 0.7);
        pipe_color = mix(pipe_color, moss_color, moss_pattern * 0.4);
        pipe_color = mix(pipe_color, bark_color, bark_pattern * 0.3);
        pipe_color = mix(pipe_color, highlight, growth_pattern * 0.2);

        // Natural vine/root effect
        float vine_pattern = fbm(vec2(pos.x * 0.04, pos.y * 0.01 - time_slow * 0.3));
        if (vine_pattern > 0.65) {
            pipe_color = mix(pipe_color, vec3(0.2, 0.4, 0.25), (vine_pattern - 0.65) * 1.5);
        }

        // Edge distance calculations for rim effect
        float dist_from_gap_top = (pos.y < gap_top) ? gap_top - pos.y : 1000.0;
        float dist_from_gap_bottom = (pos.y > gap_bottom) ? pos.y - gap_bottom : 1000.0;
        float dist_from_gap = min(dist_from_gap_top, dist_from_gap_bottom);
        float overall_edge_dist = min(dist_from_pipe_edge, dist_from_gap);

        // Soft natural glow at edges
        float rim_effect = smoothstep(0.0, 20.0, overall_edge_dist);
        vec3 soft_glow = vec3(0.3, 0.5, 0.4); // Soft green glow
        pipe_color = mix(soft_glow * 0.5, pipe_color, rim_effect);

        // Gentle breathing effect for organic feel
        float breathing = sin(time_slow * 2.0) * 0.05 + 0.95;
        pipe_color *= breathing;

        // Dew/moisture effect
        float moisture_noise = fbm(pos * 0.06 + time_slow * 0.8);
        if (moisture_noise > 0.7 && overall_edge_dist < 15.0) {
            float moisture_intensity = (moisture_noise - 0.7) * 2.0;
            pipe_color += vec3(0.2, 0.35, 0.3) * moisture_intensity * (1.0 - rim_effect);
        }

        finalColor = vec4(pipe_color, 1.0);
    } else if (in_moss) {
        // Soft moss/vine effect outside pipe edges
        float moss_opacity = 1.0 - (abs(dist_from_pipe_edge) / moss_distance);
        moss_opacity *= 0.3; // Max opacity of moss

        // Animated moss movement
        float moss_movement = fbm(vec2(pos.x * 0.02, pos.y * 0.02 - time_slow * 0.3));
        moss_opacity *= (0.5 + moss_movement * 0.5);

        // Soft forest green moss color
        vec3 moss_color = vec3(0.25, 0.4, 0.28);

        // Add some variation to the moss
        float moss_variation = fbm(pos * 0.01 + time_slow * 0.5);
        moss_color = mix(moss_color, vec3(0.2, 0.35, 0.25), moss_variation);

        finalColor = vec4(moss_color, moss_opacity);
    } else if (in_top_border || in_bottom_border) {
        // HAZARD BORDERS - Muted orange/red danger zones for cohesion
        float border_progress = in_top_border ?
            (20.0 - pos.y) / 20.0 :
            (20.0 - (u_screen_height - pos.y)) / 20.0;

        // Hazard flow patterns
        vec2 hazard_uv = vec2(pos.x * 0.008, pos.y * 0.01);
        float hazard_flow = fbm(hazard_uv + time_slow * 0.6);
        float danger_pattern = sin(pos.x * 0.03 + time_fast * 1.0) * 0.5 + 0.5;

        // Pulsing danger effect
        float pulse_pattern = fbm(vec2(pos.x * 0.05, time_fast * 1.5));
        float heat_waves = fbm(vec2(pos.x * 0.02 + time_slow * 0.4, pos.y * 0.1));

        // Muted orange/red colors to match the warm palette
        vec3 danger_dark = vec3(0.4, 0.15, 0.08); // Dark burnt orange
        vec3 danger_mid = vec3(0.65, 0.25, 0.1); // Muted orange-red
        vec3 danger_hot = vec3(0.85, 0.45, 0.2); // Warm orange (similar to bird)
        vec3 danger_glow = vec3(0.95, 0.6, 0.35); // Soft yellow-orange glow

        // Create hazard appearance
        vec3 hazard_color = mix(danger_dark, danger_mid, hazard_flow);
        hazard_color = mix(hazard_color, danger_hot, danger_pattern);
        hazard_color = mix(hazard_color, danger_glow, pulse_pattern * 0.3);

        // Add heat distortion effect
        if (heat_waves > 0.6) {
            hazard_color = mix(hazard_color, danger_glow, (heat_waves - 0.6) * 2.0);
        }

        // Gentler pulsing effect
        float danger_pulse = sin(time_fast * 2.5) * 0.15 + 0.85;
        hazard_color *= danger_pulse;

        // Add warning stripes or patterns
        float stripe_pattern = abs(sin(pos.x * 0.1 + time_slow * 2.0));
        if (stripe_pattern > 0.7) {
            hazard_color = mix(hazard_color, danger_hot, (stripe_pattern - 0.7) * 1.5);
        }

        // Crack pattern with glowing danger
        float crack_pattern = fbm(vec2(pos.x * 0.08, pos.y * 0.15));
        if (crack_pattern > 0.65) {
            hazard_color = mix(hazard_color, vec3(0.9, 0.55, 0.25), (crack_pattern - 0.65) * 2.0);
        }

        // Fade effect
        float fade_factor = smoothstep(0.0, 1.0, border_progress);
        hazard_color *= (0.6 + fade_factor * 0.4);

        // Additional warning glow
        hazard_color += vec3(0.2, 0.08, 0.02) * fade_factor;

        finalColor = vec4(hazard_color, fade_factor * 0.9);
    } else {
        // Not in pipe, moss, or borders - make transparent so background shows through
        discard;
    }
}
