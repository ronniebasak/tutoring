#version 330
in vec2 fragTexCoord;
in vec4 fragColor;
out vec4 finalColor;
uniform float u_time;
uniform vec2 u_center;
uniform float u_radius;
uniform vec2 u_velocity;

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

// Generate a more PBR-compliant color based on position and noise
vec3 getCartoonColor(vec2 uv, float dist, float baseNoise, vec2 velocity, bool isTrail) {
    float vel_magnitude = length(velocity) * 0.001;
    vec2 vel_dir = length(velocity) > 0.0 ? normalize(velocity) : vec2(0.0);

    // More realistic base colors (albedo values between 0.02-0.8)
    vec3 color1 = vec3(0.08, 0.25, 0.45); // Dark blue
    vec3 color2 = vec3(0.04, 0.35, 0.48); // Slightly brighter blue
    vec3 color3 = vec3(0.18, 0.15, 0.42); // Purple tint
    vec3 color4 = vec3(0.06, 0.38, 0.38); // Teal
    vec3 highlight = vec3(0.25, 0.35, 0.45); // Subtle highlight
    vec3 shadow = vec3(0.02, 0.08, 0.25); // Deep shadow

    // Trail gets slightly different colors but still realistic
    if (isTrail) {
        color1 = vec3(0.12, 0.28, 0.48);
        color2 = vec3(0.18, 0.32, 0.52);
        color3 = vec3(0.22, 0.35, 0.55);
        highlight = vec3(0.28, 0.38, 0.58);
    }

    vec3 speed_color = vec3(0.35, 0.22, 0.08); // Warm accent
    vec3 slow_color = vec3(0.08, 0.32, 0.18); // Cool accent

    // Create complex texture noise (reduced intensity)
    float texture_noise = fbm(uv * 0.008 + u_time * 0.12 + vel_dir * vel_magnitude * 0.0001) * 0.3;
    float detail_noise = fbm(uv * 0.025 - u_time * 0.08 + vel_dir * vel_magnitude * 0.00005) * 0.2;
    float fine_noise = noise(uv * 0.06 + u_time * 0.25 + velocity * 0.00001) * 0.15;
    float micro_noise = noise(uv * 0.12 + u_time * 0.4) * 0.08;

    float combined_noise = texture_noise + detail_noise * 0.7 + fine_noise * 0.5 + micro_noise;
    combined_noise += vel_magnitude * sin(u_time * 3.0) * 0.00002;

    float center_factor = 1.0 - smoothstep(0.0, u_radius * 0.9, dist);
    float mid_factor = smoothstep(u_radius * 0.3, u_radius * 0.7, dist);

    float bubble_pattern = sin(combined_noise * 12.0 + vel_magnitude * 5.0) * sin(combined_noise * 8.0 + 1.5);
    bubble_pattern = smoothstep(-0.2, 0.8, bubble_pattern) * 0.3; // Reduced intensity

    vec3 base_color = mix(color1, color2, smoothstep(-0.4, 0.4, combined_noise));
    base_color = mix(base_color, color3, smoothstep(0.0, 0.6, baseNoise + bubble_pattern));
    base_color = mix(base_color, color4, smoothstep(-0.2, 0.3, texture_noise));

    // Subtle velocity-based color shifts
    base_color = mix(base_color, speed_color, vel_magnitude * 0.00002);
    base_color = mix(base_color, slow_color, (1.0 - vel_magnitude) * 0.00001);

    // More subtle lighting
    base_color = mix(shadow, base_color, smoothstep(0.1, 0.6, center_factor + combined_noise * 0.15));
    base_color = mix(base_color, highlight, center_factor * (0.2 + bubble_pattern * 0.15));

    // Subtle banding (reduced)
    float bands1 = sin(combined_noise * 6.0 + u_time * 0.5 + vel_magnitude * 2.0) * 0.04 + 0.96;
    float bands2 = sin(combined_noise * 15.0 - u_time * 0.3) * 0.025 + 0.975;
    base_color *= bands1 * bands2;

    // Very subtle iridescence
    float iridescence = sin(dist * 0.1 + combined_noise * 3.0 + u_time + vel_magnitude * 8.0) * 0.05 + 0.95;
    base_color *= iridescence;

    return base_color;
}

void main()
{
    vec2 uv = gl_FragCoord.xy;
    vec2 from_center = uv - u_center;
    float dist = length(from_center);

    // Calculate velocity properties
    vec2 effective_velocity = u_velocity;
    if (abs(u_velocity.x) < 0.1) {
        effective_velocity.x = u_velocity.x + 200.0;
    }

    float vel_magnitude = length(effective_velocity);
    vec2 vel_normalized = vel_magnitude > 0.0 ? normalize(effective_velocity) : vec2(0.0);

    // Direction from center
    vec2 dir = (dist == 0.0) ? vec2(0.0) : from_center / dist;

    // Deformation (same as before)
    float vel_influence = min(vel_magnitude * 0.005, 0.5);
    float directional_alignment = dot(dir, -vel_normalized);
    float deformation = 1.0 + directional_alignment * vel_influence * 0.4;
    float lateral_factor = 1.0 - abs(dot(dir, vel_normalized));
    deformation += lateral_factor * vel_influence * 0.15;
    float deformed_dist = dist / deformation;

    // Trail effect (with reduced brightness)
    float trail_alpha = 0.0;
    vec3 trail_color = vec3(0.0);

    if (vel_magnitude > 0.1) {
        vec2 trail_dir = -vel_normalized;

        for (int i = 1; i <= 4; i++) {
            float trail_offset = float(i) * u_radius * 0.5;
            vec2 trail_center = u_center + trail_dir * trail_offset;
            vec2 from_trail = uv - trail_center;
            float trail_dist = length(from_trail);

            float trail_radius = u_radius * (1.0 - float(i) * 0.2);
            float trail_noise = fbm(from_trail * 0.02 + u_time * 0.3 + float(i)) * 0.3;
            trail_radius += trail_noise * trail_radius * 0.2;

            float segment_alpha = smoothstep(trail_radius, trail_radius - 5.0, trail_dist);
            segment_alpha *= (1.0 - float(i) * 0.22);
            segment_alpha *= min(vel_influence * 4.0, 1.0);

            if (segment_alpha > 0.0) {
                vec3 segment_color = getCartoonColor(uv, trail_dist, trail_noise, effective_velocity, true);
                // Much more subtle trail glow
                segment_color += vec3(0.08, 0.12, 0.18) * (1.0 - float(i) * 0.2);

                trail_color = mix(trail_color, segment_color, segment_alpha);
                trail_alpha = max(trail_alpha, segment_alpha * 0.4); // Reduced alpha
            }
        }
    }

    // Enhanced Amoeba Distortion (same as before)
    float distortion_noise = fbm(dir * 2.5 - u_time * 0.2 + vel_normalized * vel_influence * 2.0);
    float turbulence = fbm(from_center * 0.01 + vel_normalized * vel_influence * 1.0 + u_time * 0.1);
    distortion_noise += turbulence * vel_influence * 2.0;

    float distortion_percent = 0.4 + vel_influence * 0.2;
    float distortion_amount = u_radius * distortion_percent;
    float distorted_radius = u_radius + distortion_noise * distortion_amount;

    float velocity_pulse = sin(u_time * 4.0 + vel_magnitude * 0.01) * vel_influence * u_radius * 0.05;
    distorted_radius += velocity_pulse;

    float alpha_main = smoothstep(distorted_radius, distorted_radius - 3.0, deformed_dist);

    // More subtle outline
    float outline_radius = distorted_radius + 5.0 + vel_influence * u_radius * 0.2;
    float outline_alpha = smoothstep(outline_radius, outline_radius - 2.0, deformed_dist) - alpha_main;

    // Eye rendering (with more realistic colors)
    vec2 eye_offset = vel_magnitude > 0.1 ? vel_normalized * u_radius * 0.3 : vec2(u_radius * 0.3, 0.0);
    vec2 eye_center = u_center + eye_offset;
    vec2 from_eye = uv - eye_center;
    float eye_dist = length(from_eye);

    float eye_radius = u_radius * 0.25;
    float pupil_radius = eye_radius * 0.5;
    float iris_radius = eye_radius * 0.75;

    float eye_alpha = smoothstep(eye_radius, eye_radius - 2.0, eye_dist);

    vec2 look_target = vel_magnitude > 0.1 ? vel_normalized * 3.0 : vec2(0.0);
    vec2 iris_offset = look_target * min(eye_radius * 0.2, length(look_target));
    vec2 from_iris = from_eye - iris_offset;
    float iris_dist = length(from_iris);
    float iris_alpha = smoothstep(iris_radius, iris_radius - 1.0, iris_dist);

    vec2 from_pupil = from_iris;
    float pupil_dist = length(from_pupil);
    float pupil_alpha = smoothstep(pupil_radius, pupil_radius - 1.0, pupil_dist);

    vec2 highlight_offset = vec2(-eye_radius * 0.3, -eye_radius * 0.3);
    vec2 from_highlight = from_eye - highlight_offset;
    float highlight_dist = length(from_highlight);
    float highlight_alpha = smoothstep(eye_radius * 0.3, 0.0, highlight_dist);

    float blink = step(0.95, sin(u_time * 0.7) * sin(u_time * 1.3));
    float squint = min(vel_influence * 2.0, 0.5);
    float eyelid_y = mix(-eye_radius, eye_radius * (0.7 - squint), 1.0 - blink);
    float eyelid_alpha = smoothstep(eyelid_y, eyelid_y - 2.0, from_eye.y) * eye_alpha;

    // Compositing
    vec4 final_color = vec4(0.0);

    // Render trail first
    if (trail_alpha > 0.0) {
        final_color = vec4(trail_color, trail_alpha);
    }

    // Main blob with much more subtle rim lighting
    if (alpha_main > 0.0) {
        vec3 blob_color = getCartoonColor(uv, deformed_dist, distortion_noise, effective_velocity, false);

        // Very subtle rim lighting
        float rim1 = 1.0 - smoothstep(distorted_radius * 0.6, distorted_radius * 0.9, deformed_dist);
        float rim2 = 1.0 - smoothstep(distorted_radius * 0.8, distorted_radius, deformed_dist);
        float rim_intensity = 0.15 + vel_influence * 0.1; // Much reduced

        blob_color += vec3(0.08, 0.12, 0.18) * rim1 * rim1 * rim_intensity;
        blob_color += vec3(0.12, 0.16, 0.22) * rim2 * rim2 * (rim_intensity * 0.5);

        // Very subtle speed streaks
        float side_streak = lateral_factor * max(0.0, -directional_alignment) * vel_influence;
        blob_color += vec3(0.15, 0.18, 0.22) * side_streak * 0.1;

        // Subtle pulse
        float pulse = sin(u_time * 2.0 + vel_magnitude * 0.01) * 0.025 + 0.975;
        blob_color *= pulse;

        float alpha_variation = noise(uv * 0.03 + u_time * 0.1 + vel_normalized * vel_influence) * 0.05 + 0.95;
        alpha_main *= alpha_variation;

        final_color = mix(final_color, vec4(blob_color, 1.0), alpha_main);
    }

    // Eye rendering with more realistic colors
    if (eye_alpha > 0.0 && alpha_main > 0.5) {
        // Eye white (not pure white)
        vec3 eye_white = vec3(0.75, 0.78, 0.82);
        final_color.rgb = mix(final_color.rgb, eye_white, eye_alpha * 0.9);

        // Iris
        if (iris_alpha > 0.0) {
            vec3 iris_color = vec3(0.08, 0.15, 0.32);
            iris_color += vec3(0.04, 0.08, 0.12) * noise(from_iris * 0.1 + u_time * 0.5);
            final_color.rgb = mix(final_color.rgb, iris_color, iris_alpha);
        }

        // Pupil
        if (pupil_alpha > 0.0) {
            vec3 pupil_color = vec3(0.02, 0.02, 0.04);
            final_color.rgb = mix(final_color.rgb, pupil_color, pupil_alpha);
        }

        // Highlight (much more subtle)
        if (highlight_alpha > 0.0) {
            vec3 highlight_color = vec3(0.85, 0.88, 0.92);
            final_color.rgb = mix(final_color.rgb, highlight_color, highlight_alpha * 0.4);
        }

        // Eyelid
        if (eyelid_alpha > 0.0) {
            vec3 eyelid_color = mix(vec3(0.02, 0.08, 0.25), vec3(0.04, 0.12, 0.28), squint);
            final_color.rgb = mix(final_color.rgb, eyelid_color, eyelid_alpha);
        }
    }

    // Much more subtle outline
    if (outline_alpha > 0.0 && final_color.a < 1.0) {
        float outline_gradient = smoothstep(0.0, 1.0, outline_alpha);
        vec3 outline_color = mix(vec3(0.01, 0.02, 0.08), vec3(0.04, 0.08, 0.16), outline_gradient);
        outline_color += vec3(0.06, 0.1, 0.18) * vel_influence * 0.05;

        final_color = mix(final_color, vec4(outline_color, 1.0), outline_alpha * (0.4 + vel_influence * 0.2));
    }

    if (final_color.a > 0.0) {
        finalColor = final_color;
    } else {
        discard;
    }
}
