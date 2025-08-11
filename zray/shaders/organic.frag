#version 330
in vec2 fragTexCoord;
in vec4 fragColor;
out vec4 finalColor;

uniform float u_time;
uniform vec2 u_center;
uniform float u_radius;
uniform vec2 u_velocity;
uniform vec2 u_trail_points[20];
uniform int u_trail_count;
uniform vec2 u_eye_target;

// Simple noise function
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

// Fractional Brownian Motion for organic shapes
float fbm(vec2 st) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 3; i++) {
        value += amplitude * noise(st);
        st *= 2.0;
        amplitude *= 0.5;
    }
    return value;
}

void main()
{
    vec2 uv = gl_FragCoord.xy;
    vec2 from_center = uv - u_center;
    float dist = length(from_center);

    vec4 final_color = vec4(0.0);

    // Enhanced trail rendering with better blending
    for (int i = 0; i < 20; i++) {
        if (i >= u_trail_count) break;

        vec2 trail_point = u_trail_points[i];
        if (trail_point.x < -100.0) continue; // Skip invalid points

        vec2 from_trail = uv - trail_point;
        float trail_dist = length(from_trail);

        // Fixed trail properties - older points get smaller
        float trail_age = float(i) / max(float(u_trail_count), 1.0);
        float size_falloff = pow(trail_age, 0.1); // Older = smaller
        float alpha_falloff = pow(trail_age, 0.9); // Older = more transparent

        float trail_radius = u_radius * (1.0 - size_falloff * 0.7); // Start big, get smaller
        float trail_alpha_base = (1.0 - alpha_falloff) * 0.7;

        // Organic distortion for trails
        vec2 trail_dir = (trail_dist == 0.0) ? vec2(0.0) : from_trail / trail_dist;
        float trail_organic = fbm(trail_dir * 2.0 + u_time * 0.2) * 0.1;
        float trail_distorted_radius = trail_radius + trail_organic * trail_radius;

        // Softer trail edges
        float trail_blob_alpha = smoothstep(trail_distorted_radius + 4.0, trail_distorted_radius - 2.0, trail_dist);
        trail_blob_alpha *= trail_alpha_base;

        if (trail_blob_alpha > 0.0) {
            // Cute trail colors - softer and more pastel
            vec3 trail_base = vec3(0.3, 0.8, 0.9);
            vec3 trail_accent = vec3(0.8, 0.9, 2);

            // Gentle color variation
            float trail_noise = fbm(trail_point * 0.008 + u_time * 0.15) * 0.3 + 0.7;
            vec3 trail_color = mix(trail_base, trail_accent, trail_noise);

            // Add sparkle effect to newer trail segments
            if (trail_age < 0.6) {
                float sparkle_chance = noise(from_trail * 0.05 + u_time * 2.0);
                if (sparkle_chance > 0.85) {
                    float sparkle_intensity = (sparkle_chance - 0.85) / 0.15;
                    vec3 sparkle_color = vec3(0.8, 1.2, 1.4);
                    trail_color = mix(trail_color, sparkle_color, sparkle_intensity * 0.4);
                }
            }

            // Blend trails additively for nice overlapping
            final_color.rgb += trail_color * trail_blob_alpha * 0.5;
            final_color.a = max(final_color.a, trail_blob_alpha * 2);
        }
    }

    // Gentle jello physics with limited deformation
    float vel_magnitude = length(u_velocity) * 0.005; // Reduced sensitivity
    vec2 vel_normalized = length(u_velocity) > 0.0 ? normalize(u_velocity) : vec2(1.0, 0.0);
    vec2 dir = (dist == 0.0) ? vec2(0.0) : from_center / dist;

    // Limited squash and stretch to prevent triangles
    float directional_alignment = dot(dir, -vel_normalized);
    float max_deformation = 0.15; // Cap the deformation
    float deformation_amount = clamp(directional_alignment * vel_magnitude, -max_deformation, max_deformation);
    float deformation = 1.0 + deformation_amount;

    // Gentle bouncy wobble
    float wobble = sin(u_time * 2.5 + atan(dir.y, dir.x) * 2.0) * 0.04;
    float secondary_wobble = sin(u_time * 3.5 + dist * 0.02) * 0.02;
    deformation += wobble + secondary_wobble;

    float deformed_dist = dist / deformation;

    // Organic shape variation
    float organic_noise = fbm(dir * 1.8 + u_time * 0.25) * 0.15;
    float distorted_radius = u_radius + organic_noise * u_radius * 0.2;

    // Main blob alpha
    float alpha_main = smoothstep(distorted_radius + 3.0, distorted_radius - 4.0, deformed_dist);

    if (alpha_main > 0.0) {
        // Cute blob colors - bright but friendly
        vec3 blob_base = vec3(0.4, 0.9, 1.0);
        vec3 blob_highlight = vec3(0.6, 1.1, 1.2);
        vec3 blob_shadow = vec3(0.2, 0.7, 0.8);

        // Surface texture for cuteness
        float surface_noise = fbm(uv * 0.01 + u_time * 0.1) * 0.4 + 0.6;
        vec3 blob_color = mix(blob_base, blob_highlight, surface_noise);

        // Depth shading for 3D effect
        float depth_factor = 1.0 - smoothstep(0.0, u_radius * 0.8, dist);
        blob_color = mix(blob_color, blob_shadow, (1.0 - depth_factor) * 0.3);

        // Cute rim lighting
        float rim = 1.0 - smoothstep(distorted_radius * 0.4, distorted_radius * 0.85, deformed_dist);
        vec3 rim_color = vec3(0.7, 1.3, 1.5);
        blob_color += rim_color * rim * rim * 0.4;

        // Gentle core glow
        float core = smoothstep(u_radius * 0.7, u_radius * 0.2, dist);
        blob_color = mix(blob_color, vec3(0.8, 1.4, 1.6), core * 0.3);

        // Removed the problematic shimmer sin wave

        final_color = mix(final_color, vec4(blob_color, alpha_main), alpha_main);
    }

    // Cute eyes with improved positioning and animation
    vec2 eye_look_direction = length(u_eye_target) > 0.1 ? normalize(u_eye_target) : vec2(1.0, 0.0);

    float eye_separation = u_radius * 0.4;
    vec2 eye_base_offset = vec2(0.0, u_radius * 0.2);
    vec2 eye1_center = u_center + eye_base_offset + vec2(-eye_separation * 0.5, 0.0);
    vec2 eye2_center = u_center + eye_base_offset + vec2(eye_separation * 0.5, 0.0);

    float eye_radius = u_radius * 0.13;
    float pupil_radius = eye_radius * 0.55;

    // Cute blinking animation
    float blink_cycle = sin(u_time * 0.7) * 0.5 + 0.5;
    float blink = smoothstep(0.95, 1.0, blink_cycle);

    // Eye 1
    vec2 from_eye1 = uv - eye1_center;
    float eye1_dist = length(from_eye1);
    float eye1_alpha = smoothstep(eye_radius + 1.5, eye_radius - 1.5, eye1_dist);

    if (eye1_alpha > 0.0 && alpha_main > 0.3) {
        // Eye white with slight warmth
        vec3 eye_white = vec3(1.0, 1.0, 0.98);
        final_color.rgb = mix(final_color.rgb, eye_white, eye1_alpha * 0.9);

        // Pupil with cute offset
        vec2 pupil1_offset = eye_look_direction * eye_radius * 0.25;
        vec2 from_pupil1 = from_eye1 - pupil1_offset;
        float pupil1_dist = length(from_pupil1);
        float pupil1_alpha = smoothstep(pupil_radius + 0.5, pupil_radius - 0.5, pupil1_dist);

        if (pupil1_alpha > 0.0) {
            vec3 pupil_color = vec3(0.1, 0.15, 0.3);
            final_color.rgb = mix(final_color.rgb, pupil_color, pupil1_alpha);
        }

        // Cute highlight
        vec2 highlight1_offset = vec2(-eye_radius * 0.3, -eye_radius * 0.3);
        vec2 from_highlight1 = from_eye1 - highlight1_offset;
        float highlight1_dist = length(from_highlight1);
        float highlight1_alpha = smoothstep(eye_radius * 0.25, 0.0, highlight1_dist);

        if (highlight1_alpha > 0.0) {
            vec3 highlight_color = vec3(1.2, 1.2, 1.1);
            final_color.rgb = mix(final_color.rgb, highlight_color, highlight1_alpha * 0.8);
        }

        // Blinking effect
        if (blink > 0.0) {
            float eyelid1_y = mix(-eye_radius * 0.8, eye_radius * 0.6, blink);
            if (from_eye1.y > eyelid1_y) {
                eye1_alpha *= (1.0 - blink);
            }
        }
    }

    // Eye 2 (similar to eye 1)
    vec2 from_eye2 = uv - eye2_center;
    float eye2_dist = length(from_eye2);
    float eye2_alpha = smoothstep(eye_radius + 1.5, eye_radius - 1.5, eye2_dist);

    if (eye2_alpha > 0.0 && alpha_main > 0.3) {
        vec3 eye_white = vec3(1.0, 1.0, 0.98);
        final_color.rgb = mix(final_color.rgb, eye_white, eye2_alpha * 0.9);

        vec2 pupil2_offset = eye_look_direction * eye_radius * 0.25;
        vec2 from_pupil2 = from_eye2 - pupil2_offset;
        float pupil2_dist = length(from_pupil2);
        float pupil2_alpha = smoothstep(pupil_radius + 0.5, pupil_radius - 0.5, pupil2_dist);

        if (pupil2_alpha > 0.0) {
            vec3 pupil_color = vec3(0.1, 0.15, 0.3);
            final_color.rgb = mix(final_color.rgb, pupil_color, pupil2_alpha);
        }

        vec2 highlight2_offset = vec2(-eye_radius * 0.3, -eye_radius * 0.3);
        vec2 from_highlight2 = from_eye2 - highlight2_offset;
        float highlight2_dist = length(from_highlight2);
        float highlight2_alpha = smoothstep(eye_radius * 0.25, 0.0, highlight2_dist);

        if (highlight2_alpha > 0.0) {
            vec3 highlight_color = vec3(1.2, 1.2, 1.1);
            final_color.rgb = mix(final_color.rgb, highlight_color, highlight2_alpha * 0.8);
        }

        if (blink > 0.0) {
            float eyelid2_y = mix(-eye_radius * 0.8, eye_radius * 0.6, blink);
            if (from_eye2.y > eyelid2_y) {
                eye2_alpha *= (1.0 - blink);
            }
        }
    }

    // Subtle ambient glow around the main blob
    float glow_dist = dist - distorted_radius;
    if (glow_dist > 0.0 && glow_dist < 15.0) {
        float glow_falloff = 1.0 - smoothstep(0.0, 15.0, glow_dist);
        float glow_pulse = sin(u_time * 1.5) * 0.15 + 0.85;
        float glow_intensity = glow_falloff * glow_pulse * 0.25;

        if (glow_intensity > 0.0) {
            vec3 glow_color = vec3(0.3, 0.8, 1.0);
            final_color.rgb = mix(final_color.rgb, glow_color, glow_intensity);
            final_color.a = max(final_color.a, glow_intensity * 0.3);
        }
    }

    if (final_color.a > 0.01) {
        finalColor = final_color;
    } else {
        discard;
    }
}
