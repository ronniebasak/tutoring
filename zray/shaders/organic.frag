#version 330
in vec2 fragTexCoord;
in vec4 fragColor;
out vec4 finalColor;
uniform float u_time;
uniform vec2 u_center;
uniform float u_radius;
uniform vec2 u_velocity;
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

// Fractional Brownian Motion for smooth organic shapes
float fbm(vec2 st) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 4; i++) {
        value += amplitude * noise(st);
        st *= 2.0;
        amplitude *= 0.5;
    }
    return value;
}

// Multi-octave noise for complex emissive patterns
float complexNoise(vec2 st, float time_offset) {
    float value = 0.0;
    float amplitude = 0.6;
    vec2 shift = vec2(time_offset * 0.5);

    for (int i = 0; i < 6; i++) {
        value += amplitude * noise(st + shift);
        st *= 1.8;
        shift = vec2(shift.y + 0.3, -shift.x + 0.1);
        amplitude *= 0.55;
    }
    return value;
}

// Animated voronoi-like pattern for energy cells
float energyPattern(vec2 st, float time) {
    vec2 grid = floor(st * 3.0);
    vec2 f = fract(st * 3.0);

    float min_dist = 1.0;
    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 neighbor = vec2(float(x), float(y));
            vec2 point = 0.5 + 0.35 * sin(time + 6.2831 * (grid + neighbor));
            vec2 diff = neighbor + point - f;
            float dist = length(diff);
            min_dist = min(min_dist, dist);
        }
    }
    return min_dist;
}

void main()
{
    vec2 uv = gl_FragCoord.xy;
    vec2 from_center = uv - u_center;
    float dist = length(from_center);

    // Handle velocity - add small horizontal component if needed for side-scroller
    vec2 effective_velocity = u_velocity;
    if (length(effective_velocity) < 50.0) {
        effective_velocity.x += 100.0; // Gentle horizontal movement assumption
    }

    float vel_magnitude = length(effective_velocity) * 0.01;
    vec2 vel_normalized = length(effective_velocity) > 0.0 ? normalize(effective_velocity) : vec2(1.0, 0.0);

    // Direction from center
    vec2 dir = (dist == 0.0) ? vec2(0.0) : from_center / dist;

    // Enhanced jello deformation with emissive influence
    float vel_influence = min(vel_magnitude, 0.3);
    float directional_alignment = dot(dir, -vel_normalized);
    float deformation = 1.0 + directional_alignment * vel_influence * 0.2;

    // Enhanced wobble with multiple frequencies
    float wobble1 = sin(u_time * 3.0 + atan(dir.y, dir.x) * 2.0) * 0.05;
    float wobble2 = sin(u_time * 4.5 + dist * 0.02) * 0.03;
    float wobble3 = sin(u_time * 2.0 + atan(dir.y, dir.x) * 4.0) * 0.02;
    float total_wobble = wobble1 + wobble2 + wobble3;

    deformation += total_wobble * (1.0 + vel_influence * 0.5);

    float deformed_dist = dist / deformation;

    // Enhanced trail effect with emissive glow
    vec4 trail_result = vec4(0.0);

    if (vel_magnitude > 0.02) {
        vec2 trail_dir = -vel_normalized;

        // Create 5 trail segments with varying intensities
        for (int i = 1; i <= 5; i++) {
            float trail_step = float(i);
            float trail_offset = trail_step * u_radius * 0.5;
            vec2 trail_center = u_center + trail_dir * trail_offset;
            vec2 from_trail = uv - trail_center;
            float trail_dist = length(from_trail);

            float trail_radius = u_radius * (1.0 - trail_step * 0.12);
            float segment_alpha = smoothstep(trail_radius + 5.0, trail_radius - 2.0, trail_dist);
            segment_alpha *= (1.0 - trail_step * 0.18);
            segment_alpha *= smoothstep(0.02, 0.1, vel_magnitude);

            if (segment_alpha > 0.0) {
                // Emissive trail colors with energy
                vec3 trail_base = vec3(0.2, 0.7, 0.8);
                vec3 trail_glow = vec3(0.4, 1.2, 1.0);
                float glow_intensity = sin(u_time * 2.0 + trail_step) * 0.5 + 0.5;

                vec3 trail_color = mix(trail_base, trail_glow, glow_intensity) * (1.2 - trail_step * 0.15);
                trail_result = mix(trail_result, vec4(trail_color, segment_alpha * 0.8), segment_alpha);
            }
        }
    }

    // Enhanced organic distortion with emissive patterns
    float distortion_noise = fbm(dir * 2.0 + u_time * 0.3) * 0.3;
    float energy_distortion = complexNoise(dir * 1.5 + u_time * 0.4, u_time) * 0.15;
    float distortion_amount = u_radius * 0.25;
    float distorted_radius = u_radius + (distortion_noise + energy_distortion) * distortion_amount;

    // Main blob alpha
    float alpha_main = smoothstep(distorted_radius + 2.0, distorted_radius - 5.0, deformed_dist);

    // Enhanced blob colors with emissive base
    vec3 blob_base = vec3(0.3, 0.9, 0.7); // Bright base teal
    vec3 blob_glow = vec3(0.6, 1.4, 1.1); // Emissive glow

    // Complex organic texture with multiple noise layers
    float organic_noise1 = fbm(uv * 0.008 + u_time * 0.2) * 0.4;
    float organic_noise2 = complexNoise(uv * 0.012, u_time * 0.3) * 0.3;
    float surface_ripple = sin(dist * 0.04 + u_time * 2.5) * 0.15;
    float energy_cells = energyPattern(uv * 0.006, u_time * 0.8) * 0.6;

    float combined_noise = organic_noise1 + organic_noise2 + surface_ripple;

    // Enhanced color variation with emissive elements
    vec3 color_bright = vec3(0.7, 1.3, 1.2); // Bright emissive mint
    vec3 color_energy = vec3(0.9, 1.6, 0.8); // High-energy green-cyan

    vec3 blob_color = mix(blob_base, blob_glow, smoothstep(-0.3, 0.5, combined_noise));
    blob_color = mix(blob_color, color_bright, smoothstep(0.3, 0.8, energy_cells));
    blob_color = mix(blob_color, color_energy, smoothstep(0.6, 1.0, energy_cells) * 0.6);

    // Enhanced depth shading with emissive core
    float center_factor = 1.0 - smoothstep(0.0, u_radius * 0.8, dist);
    vec3 highlight = vec3(1.2, 1.4, 1.6); // Bright emissive highlight
    vec3 shadow = vec3(0.15, 0.5, 0.6); // Deeper shadow with slight glow

    blob_color = mix(shadow, blob_color, smoothstep(0.1, 0.9, center_factor + combined_noise * 0.3));
    blob_color = mix(blob_color, highlight, center_factor * center_factor * 0.7);

    // Enhanced rim lighting with pulsing effect
    float rim = 1.0 - smoothstep(distorted_radius * 0.2, distorted_radius * 0.9, deformed_dist);
    float rim_pulse = sin(u_time * 1.8) * 0.3 + 0.7;
    vec3 rim_color = vec3(0.4, 1.0, 1.2) * rim_pulse;
    blob_color += rim_color * rim * rim * 0.8;

    // Enhanced surface shimmer with multiple layers
    float shimmer1 = sin(dist * 0.025 + combined_noise * 4.0 + u_time * 2.0) * 0.2 + 0.8;
    float shimmer2 = sin(dist * 0.04 + u_time * 3.5 + energy_cells * 6.0) * 0.15 + 0.85;
    float shimmer3 = sin(u_time * 5.0 + atan(dir.y, dir.x) * 3.0) * 0.1 + 0.9;
    blob_color *= shimmer1 * shimmer2 * shimmer3;

    // Core energy effect - bright center with pulsing
    float core_distance = smoothstep(u_radius * 0.6, u_radius * 0.1, dist);
    float core_pulse = sin(u_time * 2.5) * 0.4 + 0.6;
    vec3 core_energy = vec3(0.8, 1.8, 1.5) * core_pulse;
    blob_color = mix(blob_color, core_energy, core_distance * 0.4);

    // Energy veins - animated flowing patterns
    float vein_pattern = 0.0;
    for (int i = 0; i < 3; i++) {
        float angle = float(i) * 2.094; // 120 degrees apart
        vec2 vein_dir = vec2(cos(angle), sin(angle));
        float vein_dist = abs(dot(from_center, vein_dir));
        float vein_flow = sin(u_time * 2.0 + dist * 0.03 + float(i) * 2.0) * 0.5 + 0.5;
        float vein_width = u_radius * 0.08 * (1.0 + vein_flow * 0.5);

        if (vein_dist < vein_width && dist < u_radius * 0.7) {
            float vein_intensity = (1.0 - vein_dist / vein_width) * vein_flow;
            vein_pattern = max(vein_pattern, vein_intensity);
        }
    }

    if (vein_pattern > 0.0) {
        vec3 vein_color = vec3(1.0, 1.8, 1.3);
        blob_color = mix(blob_color, vein_color, vein_pattern * 0.6);
    }

    // Eyes - enhanced with emissive glow
    vec2 eye_look_direction = length(u_eye_target) > 0.1 ? normalize(u_eye_target) : vec2(1.0, 0.0);

    float eye_separation = u_radius * 0.35;
    vec2 eye_base_offset = vec2(0.0, u_radius * 0.15);
    vec2 eye1_center = u_center + eye_base_offset + vec2(-eye_separation * 0.5, 0.0);
    vec2 eye2_center = u_center + eye_base_offset + vec2(eye_separation * 0.5, 0.0);

    float eye_radius = u_radius * 0.12;
    float pupil_radius = eye_radius * 0.6;

    // Enhanced blinking with anticipation
    float blink_cycle = sin(u_time * 0.8) * 0.5 + 0.5;
    float blink = step(0.92, blink_cycle) * smoothstep(0.92, 1.0, blink_cycle);

    // Eye 1 with glow
    vec2 from_eye1 = uv - eye1_center;
    float eye1_dist = length(from_eye1);
    float eye1_alpha = smoothstep(eye_radius + 1.0, eye_radius - 2.0, eye1_dist);

    // Eye glow effect
    float eye_glow_radius = eye_radius * 1.8;
    float eye1_glow = smoothstep(eye_glow_radius, eye_radius, eye1_dist);

    if ((eye1_alpha > 0.0 || eye1_glow > 0.0) && alpha_main > 0.1) {
        // Eye glow with organic particle effect
        if (eye1_glow > 0.0) {
            // Create floating sparkles around the eye
            vec2 eye_particle_coord = from_eye1 * 0.1;
            float eye_sparkles = 0.0;

            for (int j = 0; j < 4; j++) {
                float sparkle_time = u_time * 3.0 + float(j) * 1.57;
                vec2 sparkle_offset = vec2(cos(sparkle_time), sin(sparkle_time * 1.3)) * eye_radius * 0.8;
                vec2 to_sparkle = from_eye1 - sparkle_offset;
                float sparkle_dist = length(to_sparkle);

                float sparkle_noise = noise(eye_particle_coord * 20.0 + sparkle_time);
                float sparkle_strength = smoothstep(0.6, 1.0, sparkle_noise);
                float sparkle_falloff = exp(-sparkle_dist * 0.3);

                eye_sparkles += sparkle_falloff * sparkle_strength;
            }

            vec3 sparkle_color = vec3(0.8, 1.2, 1.4);
            vec3 base_glow = vec3(0.3, 0.8, 1.0) * 0.4;
            vec3 combined_glow = mix(base_glow, sparkle_color, eye_sparkles * 0.6);

            blob_color = mix(blob_color, combined_glow, eye1_glow * 0.4);
        }

        if (eye1_alpha > 0.0) {
            // Eye white with slight emissive
            vec3 eye_white = vec3(1.0, 1.1, 1.2);
            blob_color = mix(blob_color, eye_white, eye1_alpha * 0.9);

            // Pupil with emissive edge
            vec2 pupil1_offset = eye_look_direction * eye_radius * 0.3;
            vec2 from_pupil1 = from_eye1 - pupil1_offset;
            float pupil1_dist = length(from_pupil1);
            float pupil1_alpha = smoothstep(pupil_radius, pupil_radius - 1.0, pupil1_dist);
            float pupil_rim = smoothstep(pupil_radius - 0.5, pupil_radius - 1.5, pupil1_dist) - pupil1_alpha;

            if (pupil1_alpha > 0.0) {
                blob_color = mix(blob_color, vec3(0.05, 0.1, 0.3), pupil1_alpha);
            }
            if (pupil_rim > 0.0) {
                vec3 pupil_glow = vec3(0.2, 0.6, 1.0);
                blob_color = mix(blob_color, pupil_glow, pupil_rim * 0.5);
            }

            // Enhanced highlight with pulse
            vec2 highlight1_offset = vec2(-eye_radius * 0.25, -eye_radius * 0.25);
            vec2 from_highlight1 = from_eye1 - highlight1_offset;
            float highlight1_dist = length(from_highlight1);
            float highlight1_alpha = smoothstep(eye_radius * 0.3, 0.0, highlight1_dist);
            float highlight_pulse = sin(u_time * 3.0) * 0.3 + 0.7;

            if (highlight1_alpha > 0.0) {
                vec3 highlight_color = vec3(1.2, 1.4, 1.6) * highlight_pulse;
                blob_color = mix(blob_color, highlight_color, highlight1_alpha * 0.9);
            }
        }

        // Eyelid for blinking
        if (blink > 0.0) {
            float eyelid1_y = mix(-eye_radius, eye_radius * 0.5, blink);
            if (from_eye1.y > eyelid1_y) {
                eye1_alpha *= (1.0 - blink);
            }
        }
    }

    // Eye 2 with glow (similar to eye 1)
    vec2 from_eye2 = uv - eye2_center;
    float eye2_dist = length(from_eye2);
    float eye2_alpha = smoothstep(eye_radius + 1.0, eye_radius - 2.0, eye2_dist);
    float eye2_glow = smoothstep(eye_glow_radius, eye_radius, eye2_dist);

    if ((eye2_alpha > 0.0 || eye2_glow > 0.0) && alpha_main > 0.1) {
        // Eye glow with organic particle effect
        if (eye2_glow > 0.0) {
            // Create floating sparkles around the eye
            vec2 eye_particle_coord = from_eye2 * 0.1;
            float eye_sparkles = 0.0;

            for (int j = 0; j < 4; j++) {
                float sparkle_time = u_time * 3.0 + float(j) * 1.57 + 0.5; // Offset from eye1
                vec2 sparkle_offset = vec2(cos(sparkle_time), sin(sparkle_time * 1.3)) * eye_radius * 0.8;
                vec2 to_sparkle = from_eye2 - sparkle_offset;
                float sparkle_dist = length(to_sparkle);

                float sparkle_noise = noise(eye_particle_coord * 20.0 + sparkle_time);
                float sparkle_strength = smoothstep(0.6, 1.0, sparkle_noise);
                float sparkle_falloff = exp(-sparkle_dist * 0.3);

                eye_sparkles += sparkle_falloff * sparkle_strength;
            }

            vec3 sparkle_color = vec3(0.8, 1.2, 1.4);
            vec3 base_glow = vec3(0.3, 0.8, 1.0) * 0.4;
            vec3 combined_glow = mix(base_glow, sparkle_color, eye_sparkles * 0.6);

            blob_color = mix(blob_color, combined_glow, eye2_glow * 0.4);
        }

        if (eye2_alpha > 0.0) {
            // Eye white with slight emissive
            vec3 eye_white = vec3(1.0, 1.1, 1.2);
            blob_color = mix(blob_color, eye_white, eye2_alpha * 0.9);

            // Pupil with emissive edge
            vec2 pupil2_offset = eye_look_direction * eye_radius * 0.3;
            vec2 from_pupil2 = from_eye2 - pupil2_offset;
            float pupil2_dist = length(from_pupil2);
            float pupil2_alpha = smoothstep(pupil_radius, pupil_radius - 1.0, pupil2_dist);
            float pupil2_rim = smoothstep(pupil_radius - 0.5, pupil_radius - 1.5, pupil2_dist) - pupil2_alpha;

            if (pupil2_alpha > 0.0) {
                blob_color = mix(blob_color, vec3(0.05, 0.1, 0.3), pupil2_alpha);
            }
            if (pupil2_rim > 0.0) {
                vec3 pupil_glow = vec3(0.2, 0.6, 1.0);
                blob_color = mix(blob_color, pupil_glow, pupil2_rim * 0.5);
            }

            // Enhanced highlight with pulse
            vec2 highlight2_offset = vec2(-eye_radius * 0.25, -eye_radius * 0.25);
            vec2 from_highlight2 = from_eye2 - highlight2_offset;
            float highlight2_dist = length(from_highlight2);
            float highlight2_alpha = smoothstep(eye_radius * 0.3, 0.0, highlight2_dist);
            float highlight_pulse = sin(u_time * 3.0) * 0.3 + 0.7;

            if (highlight2_alpha > 0.0) {
                vec3 highlight_color = vec3(1.2, 1.4, 1.6) * highlight_pulse;
                blob_color = mix(blob_color, highlight_color, highlight2_alpha * 0.9);
            }
        }

        // Eyelid for blinking
        if (blink > 0.0) {
            float eyelid2_y = mix(-eye_radius, eye_radius * 0.5, blink);
            if (from_eye2.y > eyelid2_y) {
                eye2_alpha *= (1.0 - blink);
            }
        }
    }

    // Final composition with enhanced glow
    vec4 final_color = trail_result;

    // Main blob with enhanced emissive properties
    if (alpha_main > 0.0) {
        // Enhanced translucency with energy fluctuation
        float energy_fluctuation = sin(u_time * 1.5 + combined_noise * 2.0) * 0.15 + 0.85;
        float translucency = 0.9 + energy_fluctuation * 0.15;
        final_color = mix(final_color, vec4(blob_color, 1.0), alpha_main * translucency);
    }

    // Energy particle field around the blob
    float particle_field_distance = deformed_dist - distorted_radius;
    if (particle_field_distance > -5.0 && particle_field_distance < 20.0) {
        vec2 particle_coord = from_center * 0.02;

        // Multiple particle layers with different characteristics
        float particles = 0.0;

        // Layer 1: Small fast particles
        float small_particles = 0.0;
        for (int i = 0; i < 8; i++) {
            float angle = float(i) * 0.785 + u_time * 1.5; // 45 degree increments
            vec2 particle_offset = vec2(cos(angle), sin(angle)) * (sin(u_time * 2.0 + float(i)) * 0.5 + 1.0);
            vec2 particle_pos = particle_coord + particle_offset * 0.1;

            float particle_noise = fbm(particle_pos * 15.0 + u_time * 2.0);
            float particle_strength = smoothstep(0.4, 0.8, particle_noise);

            // Distance from this particle position
            vec2 to_particle = from_center - u_center - particle_offset * u_radius * 0.8;
            float particle_dist = length(to_particle);
            float particle_influence = exp(-particle_dist * 0.05) * particle_strength;

            small_particles += particle_influence;
        }

        // Layer 2: Medium floating particles
        float medium_particles = 0.0;
        for (int i = 0; i < 5; i++) {
            float time_offset = float(i) * 1.3;
            vec2 drift = vec2(
                    sin(u_time * 0.8 + time_offset) * 0.6,
                    cos(u_time * 0.6 + time_offset * 1.5) * 0.4
                );

            vec2 particle_pos = particle_coord + drift * 0.15;
            float particle_noise = complexNoise(particle_pos * 8.0, u_time * 1.2 + time_offset);
            float particle_strength = smoothstep(0.3, 0.9, particle_noise);

            vec2 to_particle = from_center - u_center - drift * u_radius * 1.2;
            float particle_dist = length(to_particle);
            float particle_influence = exp(-particle_dist * 0.03) * particle_strength;

            medium_particles += particle_influence;
        }

        // Layer 3: Large slow energy clouds
        float energy_clouds = 0.0;
        for (int i = 0; i < 3; i++) {
            float time_offset = float(i) * 2.1;
            vec2 cloud_drift = vec2(
                    sin(u_time * 0.3 + time_offset) * 0.8,
                    cos(u_time * 0.4 + time_offset * 0.7) * 0.9
                );

            vec2 cloud_pos = particle_coord + cloud_drift * 0.2;
            float cloud_noise = fbm(cloud_pos * 4.0 + u_time * 0.5);
            float cloud_strength = smoothstep(0.2, 0.7, cloud_noise);

            vec2 to_cloud = from_center - u_center - cloud_drift * u_radius * 1.5;
            float cloud_dist = length(to_cloud);
            float cloud_influence = exp(-cloud_dist * 0.015) * cloud_strength;

            energy_clouds += cloud_influence;
        }

        // Combine all particle layers
        particles = small_particles * 0.4 + medium_particles * 0.6 + energy_clouds * 0.8;

        // Distance-based falloff for the entire field
        float field_falloff = 1.0;
        if (particle_field_distance > 0.0) {
            field_falloff = 1.0 - smoothstep(0.0, 20.0, particle_field_distance);
        } else {
            field_falloff = smoothstep(-5.0, 0.0, particle_field_distance);
        }

        particles *= field_falloff;

        if (particles > 0.0) {
            // Organic color mixing for particles
            vec3 particle_color1 = vec3(0.3, 0.8, 1.0); // Cyan
            vec3 particle_color2 = vec3(0.6, 1.0, 0.4); // Green
            vec3 particle_color3 = vec3(0.9, 0.7, 1.0); // Purple

            float color_mix1 = sin(u_time * 1.2 + length(from_center) * 0.01) * 0.5 + 0.5;
            float color_mix2 = cos(u_time * 0.8 + atan(dir.y, dir.x)) * 0.5 + 0.5;

            vec3 mixed_color = mix(particle_color1, particle_color2, color_mix1);
            mixed_color = mix(mixed_color, particle_color3, color_mix2 * 0.3);

            // Apply particle effect
            final_color.rgb = mix(final_color.rgb, mixed_color, particles * 0.5);
            final_color.a = max(final_color.a, particles * 0.4);
        }
    }

    // Organic particle-like glow field
    float glow_distance = deformed_dist - distorted_radius;
    if (glow_distance > 0.0 && glow_distance < 25.0) {
        // Create organic glow shape using multiple noise layers
        vec2 glow_coord = from_center / u_radius;

        // Flowing particle streams
        float stream_noise1 = fbm(glow_coord * 2.0 + vec2(u_time * 0.3, u_time * 0.1)) * 0.8;
        float stream_noise2 = fbm(glow_coord * 3.5 + vec2(-u_time * 0.2, u_time * 0.25)) * 0.6;
        float stream_noise3 = fbm(glow_coord * 1.2 + vec2(u_time * 0.15, -u_time * 0.35)) * 0.4;

        // Combine streams for particle-like distribution
        float particle_density = stream_noise1 + stream_noise2 * 0.7 + stream_noise3 * 0.5;
        particle_density = smoothstep(0.3, 1.2, particle_density);

        // Distance falloff with organic variation
        float falloff_variation = fbm(glow_coord * 1.8 + u_time * 0.2) * 0.3 + 0.7;
        float distance_falloff = 1.0 - smoothstep(2.0, 25.0 * falloff_variation, glow_distance);

        // Pulsing energy waves
        float energy_wave = sin(glow_distance * 0.2 - u_time * 3.0) * 0.3 + 0.7;

        // Final glow intensity
        float glow_intensity = particle_density * distance_falloff * energy_wave;

        if (glow_intensity > 0.0) {
            // Multi-colored glow with organic color variation
            vec3 glow_base = vec3(0.2, 0.7, 0.9);
            vec3 glow_accent = vec3(0.4, 0.9, 0.6);
            vec3 glow_color = mix(glow_base, glow_accent,
                    sin(atan(dir.y, dir.x) * 2.0 + u_time) * 0.5 + 0.5);

            final_color.rgb = mix(final_color.rgb, glow_color, glow_intensity * 0.4);
            final_color.a = max(final_color.a, glow_intensity * 0.3);
        }
    }

    // Enhanced collision radius with pulsing energy
    float collision_radius = u_radius * 0.85;
    float collision_ring_width = 2.0;
    float collision_ring = smoothstep(collision_radius + collision_ring_width, collision_radius, dist) -
            smoothstep(collision_radius, collision_radius - collision_ring_width, dist);

    if (collision_ring > 0.0 && alpha_main > 0.1) {
        vec3 collision_color = vec3(0.6, 1.2, 1.4) * (sin(u_time * 4.0) * 0.4 + 0.6);
        final_color.rgb = mix(final_color.rgb, collision_color, collision_ring * 0.6);
    }

    if (final_color.a > 0.01) {
        finalColor = final_color;
    } else {
        discard;
    }
}
