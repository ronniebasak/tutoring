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

    // Organic edge distortion - more pronounced for a cute wobble
    float edge_noise = fbm(vec2(pos.y * 0.008 + time_slow, time_fast)) * 12.0;
    float micro_noise = fbm(vec2(pos.y * 0.03, time_fast * 2.0)) * 4.0;
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

    if (in_pipe) {
        // Create organic pipe texture
        vec2 pipe_uv = vec2(pos.x * 0.01, pos.y * 0.01);
        float texture_noise = fbm(pipe_uv + time_slow * 0.4);

        // Animated surface patterns
        float surface_pattern = sin(pos.y * 0.08 + time_fast) * 0.5 + 0.5;
        float vertical_flow = sin(pos.y * 0.05 + time_fast * 1.8) * 0.3 + 0.7;
        float depth_pattern = fbm(vec2(pos.x * 0.015, pos.y * 0.015 + time_slow * 0.3));

        // Base pipe color from fragColor (this comes from your Zig code)
        vec3 base_color = fragColor.rgb;

        // Create organic color variations
        vec3 pipe_highlight = base_color * 1.6; // Brighter
        vec3 pipe_shadow = base_color * 0.4; // Darker
        vec3 pipe_mid = base_color * 1.0; // Original

        // Mix colors based on patterns for organic depth
        vec3 pipe_color = mix(pipe_shadow, pipe_mid, texture_noise);
        pipe_color = mix(pipe_color, pipe_highlight, surface_pattern * 0.4);
        pipe_color = mix(pipe_color, pipe_mid, vertical_flow * 0.3);

        // Add rim lighting effect for that cute glow
        float dist_from_left = pos.x - left_edge;
        float dist_from_right = right_edge - pos.x;
        float dist_from_edge = min(dist_from_left, dist_from_right);

        // Also consider distance from gap edges
        float dist_from_gap_top = (pos.y < gap_top) ? gap_top - pos.y : 1000.0;
        float dist_from_gap_bottom = (pos.y > gap_bottom) ? pos.y - gap_bottom : 1000.0;
        float dist_from_gap = min(dist_from_gap_top, dist_from_gap_bottom);

        float overall_edge_dist = min(dist_from_edge, dist_from_gap);
        float rim_effect = smoothstep(0.0, 15.0, overall_edge_dist);

        // Apply rim lighting
        pipe_color = mix(pipe_highlight * 1.2, pipe_color, rim_effect);

        // Add subtle pulsing for life
        float pulse = sin(time_fast * 2.5) * 0.08 + 0.92;
        pipe_color *= pulse;

        // Add some sparkle near the edges for extra cuteness
        float sparkle_noise = fbm(pos * 0.1 + time_fast * 1.0);
        if (sparkle_noise > 0.8 && overall_edge_dist < 10.0) {
            float sparkle_intensity = (sparkle_noise - 0.8) * 5.0;
            pipe_color += vec3(0.3, 0.4, 0.2) * sparkle_intensity * (1.0 - rim_effect);
        }

        finalColor = vec4(pipe_color, 1.0);
    } else if (in_top_border || in_bottom_border) {
        // Beautiful border shading for top and bottom 20px
        float border_progress = in_top_border ?
            (20.0 - pos.y) / 20.0 :
            (20.0 - (u_screen_height - pos.y)) / 20.0;

        // Create mystical ground/ceiling texture
        vec2 border_uv = vec2(pos.x * 0.005, pos.y * 0.01);
        float border_noise = fbm(border_uv + time_slow * 0.2);
        float flowing_pattern = sin(pos.x * 0.02 + time_fast * 0.8) * 0.5 + 0.5;

        // Create crystalline/root-like patterns
        float crystal_pattern = fbm(vec2(pos.x * 0.03, time_fast * 0.3)) * 0.7;
        float root_veins = fbm(vec2(pos.x * 0.08 + time_slow, pos.y * 0.1)) * 0.5;

        // Base border colors - earthy/mystical tones
        vec3 border_base = in_top_border ?
            vec3(0.2, 0.15, 0.3) : // Deep purple for top (sky/mystical)
            vec3(0.3, 0.2, 0.1); // Rich brown for bottom (earth/roots)

        vec3 border_highlight = border_base * 2.0;
        vec3 border_accent = in_top_border ?
            vec3(0.5, 0.3, 0.7) : // Magical purple
            vec3(0.6, 0.4, 0.2); // Golden earth

        // Mix the patterns
        vec3 border_color = mix(border_base, border_highlight, border_noise);
        border_color = mix(border_color, border_accent, flowing_pattern * 0.4);
        border_color = mix(border_color, border_highlight, crystal_pattern * 0.3);

        // Add vein-like details
        if (root_veins > 0.6) {
            border_color += border_accent * (root_veins - 0.6) * 2.0;
        }

        // Fade effect towards the inner edge
        float fade_factor = smoothstep(0.0, 1.0, border_progress);
        border_color *= fade_factor;

        // Add gentle pulsing
        float border_pulse = sin(time_fast * 1.5) * 0.1 + 0.9;
        border_color *= border_pulse;

        // Add some magical sparkles
        float sparkle = fbm(pos * 0.15 + time_fast * 1.2);
        if (sparkle > 0.75) {
            float sparkle_intensity = (sparkle - 0.75) * 4.0;
            vec3 sparkle_color = in_top_border ?
                vec3(0.8, 0.6, 1.0) : // Purple sparkles for top
                vec3(1.0, 0.8, 0.4); // Golden sparkles for bottom
            border_color += sparkle_color * sparkle_intensity * 0.3;
        }

        finalColor = vec4(border_color, fade_factor * 0.8);
    } else {
        // Not in pipe or borders - make transparent so background shows through
        discard;
    }
}
