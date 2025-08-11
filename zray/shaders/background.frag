#version 330
in vec2 fragTexCoord;
in vec4 fragColor;
out vec4 finalColor;

uniform float u_time;
uniform vec2 u_resolution;
uniform float u_pipe_speed;

// Hash functions for variety
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float hash3(vec2 p) {
    return fract(sin(dot(p, vec2(269.5, 183.3))) * 65287.1453);
}

// Simple noise for nebula
float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

// Enhanced fbm with more octaves for better detail
float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) { // Increased from 3 to 5 octaves
        v += a * noise(p);
        p *= 2.0;
        a *= 0.5;
    }
    return v;
}

// Highly varied glowing stars
float varied_star(vec2 uv, float layer_speed, float density, float base_size, float depth_factor) {
    vec2 offset = vec2(-u_time * layer_speed * u_pipe_speed * 0.0003, 0.0);
    vec2 star_uv = (uv + offset) * density;
    vec2 star_id = floor(star_uv);
    vec2 star_pos = fract(star_uv) - 0.5;

    float star_hash = hash(star_id);
    float size_hash = hash(star_id + vec2(13.7, 37.1));
    float brightness_hash = hash(star_id + vec2(91.3, 47.9));
    float shape_hash = hash3(star_id);

    if (star_hash > 0.94) { // 6% chance for star
        vec2 star_center = star_pos * (0.6 + shape_hash * 0.4);
        float star_dist = length(star_center);

        float size_variation = pow(size_hash, 1.5) * 4.0 + 0.5;
        float size = base_size * depth_factor * size_variation;

        float brightness_variation = pow(brightness_hash, 1.2) * 3.0 + 0.3;
        float brightness = depth_factor * brightness_variation;

        float core_intensity = 0.5 + brightness_hash * 1.0;
        float core = (1.0 - smoothstep(0.0, size * 0.25, star_dist)) * core_intensity;

        float glow_size = 3.0 + shape_hash * 12.0;
        float glow = exp(-star_dist * (glow_size / size)) * (0.3 + shape_hash * 0.5);

        float twinkle = sin(u_time * (2.0 + brightness_hash * 4.0) + star_hash * 6.28) * 0.1 + 0.9;

        return (core + glow) * brightness * twinkle;
    }
    return 0.0;
}

// Star color variation
vec3 star_color_variation(vec2 star_id, float base_temp) {
    float color_hash = hash(star_id + vec2(73.2, 41.8));
    float temp_variation = base_temp + (color_hash - 0.5) * 0.4;

    if (temp_variation < 0.3) {
        return mix(vec3(0.7, 0.8, 1.2), vec3(0.8, 0.9, 1.0), temp_variation / 0.3);
    } else if (temp_variation < 0.7) {
        return mix(vec3(0.8, 0.9, 1.0), vec3(1.0, 1.0, 0.9), (temp_variation - 0.3) / 0.4);
    } else {
        return mix(vec3(1.0, 1.0, 0.9), vec3(1.2, 0.8, 0.6), (temp_variation - 0.7) / 0.3);
    }
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;

    // Darker space base to provide more contrast
    vec3 base_color = vec3(0.005, 0.008, 0.015);

    // Subtle gradient
    float vertical_gradient = 1.0 - uv.y;
    base_color += vec3(0.005, 0.003, 0.01) * vertical_gradient * 0.3;

    // MUCH MORE VISIBLE nebula layers with varied motion
    vec2 nebula_uv1 = uv * 0.8 + vec2(-u_time * u_pipe_speed * 0.0002, u_time * 0.01);
    vec2 nebula_uv2 = uv * 1.5 + vec2(-u_time * u_pipe_speed * 0.0003, u_time * 0.015);
    vec2 nebula_uv3 = uv * 2.2 + vec2(-u_time * u_pipe_speed * 0.0001, u_time * 0.008);
    vec2 nebula_uv4 = uv * 0.5 + vec2(-u_time * u_pipe_speed * 0.00015, u_time * 0.005);

    float nebula1 = fbm(nebula_uv1);
    float nebula2 = fbm(nebula_uv2);
    float nebula3 = fbm(nebula_uv3);
    float nebula4 = fbm(nebula_uv4);

    // Apply power curves to create more contrast and visible regions
    nebula1 = pow(nebula1, 1.5) * 0.35; // Much stronger than 0.08
    nebula2 = pow(nebula2, 2.0) * 0.25; // Much stronger than 0.06
    nebula3 = pow(nebula3, 1.8) * 0.18; // Much stronger than 0.04
    nebula4 = pow(nebula4, 1.2) * 0.12; // New layer for depth

    // More vibrant nebula colors - purples, blues, and teals
    vec3 nebula_color1 = vec3(0.15, 0.08, 0.25) * nebula1; // Purple
    vec3 nebula_color2 = vec3(0.05, 0.2, 0.4) * nebula2; // Blue
    vec3 nebula_color3 = vec3(0.08, 0.25, 0.2) * nebula3; // Teal
    vec3 nebula_color4 = vec3(0.2, 0.1, 0.15) * nebula4; // Magenta

    // Highly varied star layers
    float far_stars = varied_star(uv, 0.15, 90.0, 0.006, 0.35);
    float mid_stars = varied_star(uv, 0.4, 60.0, 0.012, 0.65);
    float near_stars = varied_star(uv, 0.8, 35.0, 0.02, 1.0);
    float closest_stars = varied_star(uv, 1.5, 20.0, 0.035, 1.4);

    // Varied star colors per layer
    vec3 far_color = vec3(0.0);
    vec3 mid_color = vec3(0.0);
    vec3 near_color = vec3(0.0);
    vec3 closest_color = vec3(0.0);

    // Apply colors with variation
    if (far_stars > 0.01) {
        vec2 star_id = floor((uv + vec2(-u_time * 0.15 * u_pipe_speed * 0.0003, 0.0)) * 90.0);
        far_color = star_color_variation(star_id, 0.2) * far_stars;
    }

    if (mid_stars > 0.01) {
        vec2 star_id = floor((uv + vec2(-u_time * 0.4 * u_pipe_speed * 0.0003, 0.0)) * 60.0);
        mid_color = star_color_variation(star_id, 0.5) * mid_stars;
    }

    if (near_stars > 0.01) {
        vec2 star_id = floor((uv + vec2(-u_time * 0.8 * u_pipe_speed * 0.0003, 0.0)) * 35.0);
        near_color = star_color_variation(star_id, 0.7) * near_stars;
    }

    if (closest_stars > 0.01) {
        vec2 star_id = floor((uv + vec2(-u_time * 1.5 * u_pipe_speed * 0.0003, 0.0)) * 20.0);
        closest_color = star_color_variation(star_id, 0.8) * closest_stars;
    }

    // Enhanced cosmic dust with more visibility
    float dust = fbm(uv * 4.0 + vec2(-u_time * u_pipe_speed * 0.0001, u_time * 0.02)) * 0.08;
    vec3 dust_color = vec3(0.03, 0.04, 0.06) * dust;

    // Combine everything
    vec3 final_rgb = base_color;
    final_rgb += nebula_color1 + nebula_color2 + nebula_color3 + nebula_color4;
    final_rgb += dust_color;
    final_rgb += far_color;
    final_rgb += mid_color;
    final_rgb += near_color;
    final_rgb += closest_color;

    // Reduced vignette to avoid darkening nebula
    float vignette = 1.0 - length(uv - 0.5) * 0.08;
    final_rgb *= vignette;

    // Optional: Slight contrast boost to make nebula pop
    final_rgb = pow(final_rgb, vec3(0.9));

    finalColor = vec4(final_rgb, 1.0);
}
