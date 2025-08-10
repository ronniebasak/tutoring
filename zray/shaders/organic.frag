#version 330
in vec2 fragTexCoord;
in vec4 fragColor;
out vec4 finalColor;
uniform float u_time;
uniform vec2 u_center;
uniform float u_radius;

// A standard 2D value noise function.
float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    float a = fract(sin(dot(i, vec2(12.9898, 78.233))) * 43758.5453);
    float b = fract(sin(dot(i + vec2(1.0, 0.0), vec2(12.9898, 78.233))) * 43758.5453);
    float c = fract(sin(dot(i + vec2(0.0, 1.0), vec2(12.9898, 78.233))) * 43758.5453);
    float d = fract(sin(dot(i + vec2(1.0, 1.0), vec2(12.9898, 78.233))) * 43758.5453);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

// Fractional Brownian Motion (fbm), now centered around 0.
float fbm(vec2 st) {
    float value = 0.0;
    float amplitude = 0.5;
    float totalAmplitude = 0.0;
    for (int i = 0; i < 5; i++) {
        value += amplitude * noise(st);
        totalAmplitude += amplitude;
        st *= 2.0;
        amplitude *= 0.5;
    }
    return value - (totalAmplitude * 0.5);
}

// Generate a cartoony color based on position and noise
vec3 getCartoonColor(vec2 uv, float dist, float baseNoise) {
    // Enhanced color palette with more vibrant colors
    vec3 color1 = vec3(0.15, 0.5, 1.0); // Bright cyan-blue
    vec3 color2 = vec3(0.05, 0.7, 0.95); // Electric blue
    vec3 color3 = vec3(0.4, 0.3, 0.9); // Purple-blue
    vec3 color4 = vec3(0.1, 0.8, 0.8); // Turquoise
    vec3 highlight = vec3(0.8, 0.95, 1.0); // Bright white-blue highlight
    vec3 shadow = vec3(0.05, 0.2, 0.6); // Deep blue shadow

    // Create more complex texture noise
    float texture_noise = fbm(uv * 0.008 + u_time * 0.12) * 0.6;
    float detail_noise = fbm(uv * 0.025 - u_time * 0.08) * 0.4;
    float fine_noise = noise(uv * 0.06 + u_time * 0.25) * 0.3;
    float micro_noise = noise(uv * 0.12 + u_time * 0.4) * 0.15;

    // Combine noise layers with different weights
    float combined_noise = texture_noise + detail_noise * 0.7 + fine_noise * 0.5 + micro_noise;

    // Create radial gradient for depth
    float center_factor = 1.0 - smoothstep(0.0, u_radius * 0.9, dist);
    float mid_factor = smoothstep(u_radius * 0.3, u_radius * 0.7, dist);

    // Create cellular/bubble-like patterns
    float bubble_pattern = sin(combined_noise * 12.0) * sin(combined_noise * 8.0 + 1.5);
    bubble_pattern = smoothstep(-0.2, 0.8, bubble_pattern) * 0.6;

    // Base color mixing with more variation
    vec3 base_color = mix(color1, color2, smoothstep(-0.4, 0.4, combined_noise));
    base_color = mix(base_color, color3, smoothstep(0.0, 0.6, baseNoise + bubble_pattern));
    base_color = mix(base_color, color4, smoothstep(-0.2, 0.3, texture_noise));

    // Add depth with shadows and highlights
    base_color = mix(shadow, base_color, smoothstep(0.1, 0.6, center_factor + combined_noise * 0.3));
    base_color = mix(base_color, highlight, center_factor * (0.5 + bubble_pattern * 0.3));

    // Enhanced banding with multiple frequencies
    float bands1 = sin(combined_noise * 6.0 + u_time * 0.5) * 0.08 + 0.92;
    float bands2 = sin(combined_noise * 15.0 - u_time * 0.3) * 0.05 + 0.95;
    base_color *= bands1 * bands2;

    // Add subtle iridescence effect
    float iridescence = sin(dist * 0.1 + combined_noise * 3.0 + u_time) * 0.1 + 0.9;
    base_color *= iridescence;

    return base_color;
}

void main()
{
    vec2 uv = gl_FragCoord.xy;
    vec2 from_center = uv - u_center;
    float dist = length(from_center);

    // --- Amoeba Distortion ---
    vec2 dir = (dist == 0.0) ? vec2(0.0) : from_center / dist;
    float distortion_noise = fbm(dir * 2.5 - u_time * 0.2);

    // --- Dynamic Radius Calculation ---
    float distortion_percent = 0.4;
    float distortion_amount = u_radius * distortion_percent;
    float distorted_radius = u_radius + distortion_noise * distortion_amount;

    // --- Enhanced Edge with Multiple Layers ---
    // Main shape
    float alpha_main = smoothstep(distorted_radius, distorted_radius - 3.0, dist);

    // Add a subtle outer glow/cartoon outline effect
    float outline_radius = distorted_radius + 5.0;
    float outline_alpha = smoothstep(outline_radius, outline_radius - 2.0, dist) - alpha_main;

    if (alpha_main > 0.0) {
        // Get the cartoony color
        vec3 blob_color = getCartoonColor(uv, dist, distortion_noise);

        // Enhanced rim lighting with multiple layers
        float rim1 = 1.0 - smoothstep(distorted_radius * 0.6, distorted_radius * 0.9, dist);
        float rim2 = 1.0 - smoothstep(distorted_radius * 0.8, distorted_radius, dist);

        // Add energetic rim effects
        blob_color += vec3(0.4, 0.6, 1.0) * rim1 * rim1 * 0.8;
        blob_color += vec3(0.6, 0.8, 1.0) * rim2 * rim2 * 0.4;

        // Add pulsing energy effect
        float pulse = sin(u_time * 2.0) * 0.05 + 0.95;
        blob_color *= pulse;

        // Enhance the alpha with subtle variation
        float alpha_variation = noise(uv * 0.03 + u_time * 0.1) * 0.1 + 0.9;
        alpha_main *= alpha_variation;

        finalColor = vec4(blob_color, alpha_main);
    } else if (outline_alpha > 0.0) {
        // Enhanced outline with gradient
        float outline_gradient = smoothstep(0.0, 1.0, outline_alpha);
        vec3 outline_color = mix(vec3(0.02, 0.05, 0.2), vec3(0.1, 0.2, 0.4), outline_gradient);
        finalColor = vec4(outline_color, outline_alpha * 0.8);
    } else {
        discard;
    }
}
