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

// Advanced FBM with more octaves for detail
float fbmDetail(vec2 p, int octaves) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;

    for (int i = 0; i < octaves; i++) {
        value += amplitude * smoothNoise(p * frequency);
        amplitude *= 0.47;
        frequency *= 2.13;
    }

    return value;
}

// Voronoi noise for cellular patterns
vec2 voronoi(vec2 p) {
    vec2 n = floor(p);
    vec2 f = fract(p);

    float minDist = 2.0;
    vec2 minPoint;

    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 neighbor = vec2(float(x), float(y));
            vec2 point = neighbor + noise(n + neighbor) * vec2(0.5);
            float dist = length(point - f);

            if (dist < minDist) {
                minDist = dist;
                minPoint = point;
            }
        }
    }

    return vec2(minDist, 0.0);
}

void main() {
    vec2 pos = vec2(gl_FragCoord.x, u_screen_height - gl_FragCoord.y);

    // Multiple time scales for complex animation
    float time_crawl = u_time * 0.15;
    float time_slow = u_time * 0.3;
    float time_medium = u_time * 0.7;
    float time_fast = u_time * 1.5;
    float time_ultra = u_time * 3.0;

    // TRIPPY PSYCHEDELIC EDGE DISTORTION (reduced to preserve pipe width)
    float psychedelic_wave = sin(pos.y * 0.01 + time_medium) * cos(pos.y * 0.007 - time_slow * 0.8);
    float fractal_distort = fbmDetail(vec2(pos.y * 0.005 + time_crawl, time_medium * 0.5), 6);
    float spiral_distort = sin(pos.y * 0.02 + time_fast * 0.5 + fractal_distort * 3.0) * 3.0;

    // Breathing/pulsing distortion (more subtle)
    float breathing = sin(time_slow * 2.0) * 1.5 + sin(time_medium * 3.7) * 1.0;

    // Combine distortions for trippy effect (reduced overall amplitude)
    float total_distortion = (psychedelic_wave * 6.0) +
            (fractal_distort * 8.0) +
            spiral_distort +
            breathing;

    // Calculate pipe boundaries with trippy edges
    float left_edge = u_pipe_x - u_pipe_width * 0.5 + total_distortion;
    float right_edge = u_pipe_x + u_pipe_width * 0.5 - total_distortion;

    // Gap boundaries
    float gap_top = u_gap_start;
    float gap_bottom = u_gap_start + u_gap_size;

    // Check positions
    bool in_pipe_x = pos.x >= left_edge && pos.x <= right_edge;
    bool in_gap = pos.y >= gap_top && pos.y <= gap_bottom;
    bool in_pipe = in_pipe_x && !in_gap;

    // Check if we're in the top or bottom border areas
    bool in_top_border = pos.y <= 20.0;
    bool in_bottom_border = pos.y >= u_screen_height - 20.0;

    // Advanced toxic fog/fumes with volumetric effect
    float dist_from_left = pos.x - left_edge;
    float dist_from_right = right_edge - pos.x;
    float dist_from_pipe_edge = min(dist_from_left, dist_from_right);

    float fume_distance = 50.0; // Extended fume range
    bool in_fumes = in_pipe_x && !in_gap && dist_from_pipe_edge < 0.0 && dist_from_pipe_edge > -fume_distance;

    // REALISTIC DRIP TRACKING
    // Create multiple drip streams with proper physics
    float drip_column = mod(pos.x * 0.08, 1.0);
    float drip_id = floor(pos.x * 0.08);
    float drip_speed = 0.5 + noise(vec2(drip_id, 0.0)) * 0.3;
    float drip_phase = fract(time_slow * drip_speed + noise(vec2(drip_id, 1.0)));

    // Drip position with acceleration (gravity effect)
    float drip_y = drip_phase * drip_phase * 400.0; // Quadratic for acceleration
    float drip_here = 1.0 - smoothstep(0.0, 30.0, abs(pos.y - drip_y));

    // Make drips stretch as they fall
    float drip_stretch = 1.0 + drip_phase * 3.0;
    drip_here *= smoothstep(0.0, 0.1, drip_column - 0.45) * smoothstep(0.0, 0.1, 0.55 - drip_column);
    drip_here *= (1.0 - smoothstep(20.0 * drip_stretch, 30.0 * drip_stretch, pos.y - drip_y));

    if (in_pipe) {
        // MODERN SHADER TECHNIQUES
        // Parallax-like depth layers
        vec2 uv1 = vec2(pos.x * 0.01, pos.y * 0.01 + time_slow * 0.2);
        vec2 uv2 = vec2(pos.x * 0.02, pos.y * 0.02 - time_slow * 0.15);
        vec2 uv3 = vec2(pos.x * 0.005, pos.y * 0.005 + time_crawl * 0.3);

        float layer1 = fbmDetail(uv1, 5);
        float layer2 = fbmDetail(uv2, 4);
        float layer3 = fbmDetail(uv3, 6);

        // Voronoi cells for toxic bubbling
        vec2 cell_uv = vec2(pos.x * 0.03, pos.y * 0.03 + time_medium);
        vec2 cells = voronoi(cell_uv);
        float bubble_mask = 1.0 - smoothstep(0.1, 0.3, cells.x);

        // Chromatic aberration effect for toxicity
        float chromatic_offset = sin(pos.y * 0.05 + time_fast) * 0.01;

        // Iridescent oil-slick effect
        float iridescence = sin(layer1 * 10.0 + time_medium * 2.0) * 0.5 + 0.5;

        // Modern color palette - deep toxic with iridescent highlights
        vec3 toxic_deep = vec3(0.02, 0.08, 0.03);
        vec3 toxic_mid = vec3(0.05, 0.15, 0.04);
        vec3 toxic_bright = vec3(0.1, 0.25, 0.05);
        vec3 toxic_highlight = vec3(0.15, 0.4, 0.08);
        vec3 iridescent_cyan = vec3(0.05, 0.3, 0.25);
        vec3 iridescent_purple = vec3(0.15, 0.1, 0.25);

        // Layer composition with depth
        vec3 pipe_color = mix(toxic_deep, toxic_mid, layer3);
        pipe_color = mix(pipe_color, toxic_bright, layer2 * 0.7);
        pipe_color = mix(pipe_color, toxic_highlight, layer1 * 0.4);

        // Add iridescent shimmer
        vec3 shimmer_color = mix(iridescent_cyan, iridescent_purple, iridescence);
        pipe_color = mix(pipe_color, shimmer_color, bubble_mask * 0.3 * sin(time_fast * 4.0) * 0.5 + 0.5);

        // Apply drips with glowing effect
        if (drip_here > 0.01) {
            vec3 drip_color = vec3(0.2, 0.5, 0.1) * (1.0 + drip_here);
            pipe_color = mix(pipe_color, drip_color, drip_here * 0.8);
        }

        // Edge distance for advanced rim lighting
        float dist_from_gap_top = (pos.y < gap_top) ? gap_top - pos.y : 1000.0;
        float dist_from_gap_bottom = (pos.y > gap_bottom) ? pos.y - gap_bottom : 1000.0;
        float dist_from_gap = min(dist_from_gap_top, dist_from_gap_bottom);
        float overall_edge_dist = min(dist_from_pipe_edge, dist_from_gap);

        // Subsurface scattering approximation
        float sss = 1.0 - smoothstep(0.0, 30.0, overall_edge_dist);
        vec3 sss_color = vec3(0.3, 0.6, 0.15) * 0.4;
        pipe_color += sss_color * sss * (0.5 + sin(time_fast * 3.0) * 0.5);

        // Energy field distortion near edges
        if (overall_edge_dist < 20.0) {
            float field_strength = 1.0 - (overall_edge_dist / 20.0);
            float field_pulse = sin(time_ultra * 10.0 - overall_edge_dist * 0.5) * field_strength;
            pipe_color += vec3(0.1, 0.3, 0.05) * field_pulse * 0.3;
        }

        // Holographic scanlines
        float scanline = sin(pos.y * 0.5 + time_fast * 5.0) * 0.05 + 0.95;
        pipe_color *= scanline;

        // Glitch effect occasionally
        float glitch_chance = fbm(vec2(time_fast * 10.0, 0.0));
        if (glitch_chance > 0.98) {
            pipe_color.rg = pipe_color.gr;
        }

        finalColor = vec4(pipe_color, 1.0);
    } else if (in_fumes) {
        // VOLUMETRIC FOG with modern techniques
        float fume_density = 1.0 - (abs(dist_from_pipe_edge) / fume_distance);

        // Multiple fog layers moving at different speeds
        float fog1 = fbmDetail(vec2(pos.x * 0.02, pos.y * 0.02 - time_medium * 0.8), 5);
        float fog2 = fbmDetail(vec2(pos.x * 0.015, pos.y * 0.015 - time_slow * 0.5), 4);
        float fog3 = fbmDetail(vec2(pos.x * 0.03, pos.y * 0.01 - time_fast * 0.3), 3);

        // Combine fog layers with turbulence
        float combined_fog = (fog1 * 0.5 + fog2 * 0.3 + fog3 * 0.2);
        float turbulence = fbm(vec2(combined_fog * 5.0, time_medium));

        fume_density *= (0.4 + combined_fog * 0.6);
        fume_density *= (0.7 + turbulence * 0.3);

        // Color with depth
        vec3 fume_near = vec3(0.3, 0.5, 0.1);
        vec3 fume_far = vec3(0.15, 0.3, 0.05);
        vec3 fume_color = mix(fume_far, fume_near, fume_density);

        // Add toxic particles
        float particles = fbmDetail(pos * 0.05 + vec2(0.0, -time_fast * 2.0), 6);
        if (particles > 0.7) {
            fume_color += vec3(0.2, 0.4, 0.1) * (particles - 0.7) * 3.0;
        }

        finalColor = vec4(fume_color, fume_density * 0.6);
    } else if (in_top_border || in_bottom_border) {
        // NEXT-GEN LAVA EFFECT
        float border_progress = in_top_border ?
            (20.0 - pos.y) / 20.0 :
            (20.0 - (u_screen_height - pos.y)) / 20.0;

        // Complex lava flow simulation
        vec2 flow_uv = vec2(pos.x * 0.01, pos.y * 0.01);
        float flow_speed = 1.2;

        // Multiple flow layers
        float lava_flow1 = fbmDetail(flow_uv + vec2(time_slow * flow_speed, 0.0), 5);
        float lava_flow2 = fbmDetail(flow_uv * 1.5 - vec2(time_slow * flow_speed * 0.7, time_slow * 0.3), 4);
        float lava_flow3 = fbmDetail(flow_uv * 0.7 + vec2(0.0, time_medium * flow_speed * 0.5), 6);

        // Voronoi for lava cracks
        vec2 crack_uv = vec2(pos.x * 0.05, pos.y * 0.1) + vec2(time_crawl * 0.1, 0.0);
        vec2 cracks = voronoi(crack_uv);
        float crack_glow = 1.0 - smoothstep(0.0, 0.1, cracks.x);

        // Temperature simulation
        float heat_base = lava_flow1 * 0.4 + lava_flow2 * 0.3 + lava_flow3 * 0.3;
        float heat_variation = sin(pos.x * 0.1 + time_fast * 2.0) * cos(pos.y * 0.15 - time_medium);
        float temperature = heat_base + heat_variation * 0.2 + crack_glow * 0.3;

        // Blackbody radiation colors (physically accurate)
        vec3 lava_cool = vec3(0.1, 0.01, 0.0); // Almost black
        vec3 lava_warm = vec3(0.3, 0.05, 0.0); // Dark red
        vec3 lava_hot = vec3(0.8, 0.2, 0.0); // Bright red-orange
        vec3 lava_molten = vec3(1.0, 0.6, 0.1); // Orange-yellow
        vec3 lava_core = vec3(1.0, 0.95, 0.7); // Almost white

        // Temperature-based color mapping
        vec3 lava_color;
        if (temperature < 0.2) {
            lava_color = mix(lava_cool, lava_warm, temperature * 5.0);
        } else if (temperature < 0.4) {
            lava_color = mix(lava_warm, lava_hot, (temperature - 0.2) * 5.0);
        } else if (temperature < 0.7) {
            lava_color = mix(lava_hot, lava_molten, (temperature - 0.4) * 3.33);
        } else {
            lava_color = mix(lava_molten, lava_core, (temperature - 0.7) * 3.33);
        }

        // Add bloom-like glow to hot areas
        if (temperature > 0.6) {
            float bloom_strength = (temperature - 0.6) * 2.5;
            lava_color += lava_core * bloom_strength * 0.5;
        }

        // Lava bubbles with physics
        float bubble_chance = fbmDetail(vec2(pos.x * 0.08, time_medium * 0.5), 3);
        if (bubble_chance > 0.7) {
            float bubble_life = sin((bubble_chance - 0.7) * 10.0 + time_fast * 5.0);
            if (bubble_life > 0.0) {
                lava_color = mix(lava_color, lava_core, bubble_life * 0.5);
            }
        }

        // Heat distortion shimmer
        float shimmer = sin(pos.x * 0.3 + time_ultra * 8.0) * sin(pos.y * 0.2 - time_ultra * 6.0);
        lava_color *= 1.0 + shimmer * 0.1;

        // Violent eruption sparkles
        float eruption = fbmDetail(pos * 0.1 + vec2(0.0, -time_fast * 5.0), 5);
        if (eruption > 0.8) {
            float spark_intensity = pow((eruption - 0.8) * 5.0, 2.0);
            lava_color = mix(lava_color, vec3(1.0, 1.0, 0.8), spark_intensity * 0.6);
        }

        finalColor = vec4(lava_color, border_progress * 0.98);
    } else {
        // Not in any area - transparent
        discard;
    }
}
