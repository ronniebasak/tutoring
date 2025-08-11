#version 330
in vec2 fragTexCoord;
in vec4 fragColor;
out vec4 finalColor;
uniform float u_time;
uniform vec2 u_center;
uniform float u_radius;
uniform vec2 u_velocity;

// Add these new uniforms for eye lag
uniform vec2 u_eye_target; // The lagged eye position target

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

// Fractional Brownian Motion (fbm)
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

// Generate warm orange/yellow jello-like colors with depth
vec3 getJelloColor(vec2 uv, float dist, float baseNoise, vec2 velocity, bool isTrail) {
    float vel_magnitude = length(velocity) * 0.001;
    vec2 vel_dir = length(velocity) > 0.0 ? normalize(velocity) : vec2(0.0);

    // Warm orange/yellow jello colors (#ff8c42 as base)
    vec3 color1 = vec3(1.0, 0.55, 0.26); // #ff8c42 - Main warm orange
    vec3 color2 = vec3(0.95, 0.65, 0.35); // Lighter peachy orange
    vec3 color3 = vec3(1.0, 0.75, 0.45); // Light yellow-orange
    vec3 color4 = vec3(0.85, 0.45, 0.2); // Deeper orange accent
    vec3 highlight = vec3(1.0, 0.9, 0.7); // Warm yellow-white highlight
    vec3 shadow = vec3(0.4, 0.2, 0.08); // Deep warm shadow
    vec3 depth_color = vec3(0.6, 0.35, 0.15); // Deep interior warm color

    if (isTrail) {
        // Trail gets more transparent and slightly lighter
        color1 = vec3(1.0, 0.6, 0.35);
        color2 = vec3(0.95, 0.7, 0.45);
        color3 = vec3(1.0, 0.8, 0.55);
        highlight = vec3(1.0, 0.85, 0.65);
        depth_color = vec3(0.65, 0.4, 0.25);
    }

    // Create jello-like wobbly texture
    float jello_wobble = fbm(uv * 0.01 + u_time * 0.3 + vel_dir * vel_magnitude * 0.0002) * 0.4;
    float surface_ripples = fbm(uv * 0.03 - u_time * 0.15 + vel_dir * vel_magnitude * 0.0001) * 0.3;
    float fine_bubbles = noise(uv * 0.08 + u_time * 0.4 + velocity * 0.00002) * 0.2;

    // Add more dramatic jello movement
    float jello_pulse = sin(u_time * 2.5 + dist * 0.01) * 0.1;
    float combined_noise = jello_wobble + surface_ripples * 0.8 + fine_bubbles * 0.6 + jello_pulse;

    // Add velocity-based stretching effect
    combined_noise += vel_magnitude * sin(u_time * 4.0 + dist * 0.005) * 0.00005;

    float center_factor = 1.0 - smoothstep(0.0, u_radius * 0.8, dist);

    // Create depth-based color mixing
    float depth_factor = smoothstep(0.0, u_radius * 0.6, dist);
    float depth_noise = fbm(uv * 0.005 + u_time * 0.1) * 0.3;

    // Interior depth effect
    float interior_depth = (1.0 - depth_factor) * (1.0 + depth_noise);

    // Create jello-like internal structure with depth
    float jello_pattern = sin(combined_noise * 8.0 + vel_magnitude * 3.0) * sin(combined_noise * 12.0 + 2.0);
    jello_pattern = smoothstep(-0.3, 0.9, jello_pattern) * 0.4;

    // Base color mixing with depth
    vec3 base_color = mix(color1, color2, smoothstep(-0.5, 0.5, combined_noise));
    base_color = mix(base_color, color3, smoothstep(0.0, 0.7, baseNoise + jello_pattern));
    base_color = mix(base_color, color4, smoothstep(-0.3, 0.4, surface_ripples) * 0.3);

    // Add depth coloring - deeper areas get darker
    base_color = mix(base_color, depth_color, interior_depth * 0.4);

    // Enhanced lighting with depth-based shadows
    float internal_glow = center_factor * (0.4 + jello_pattern * 0.3);
    float depth_shadow = depth_factor * depth_factor * 0.3;

    base_color = mix(shadow, base_color, smoothstep(0.2, 0.8, center_factor + combined_noise * 0.2 - depth_shadow));
    base_color = mix(base_color, highlight, internal_glow * (1.0 - depth_factor * 0.5));

    // Add jello surface shine with depth consideration
    float surface_shine = sin(dist * 0.05 + combined_noise * 5.0 + u_time * 1.5 + vel_magnitude * 6.0) * 0.15 + 0.85;
    surface_shine *= (1.0 - depth_factor * 0.2); // Less shine in deeper areas
    base_color *= surface_shine;

    // Jello translucency effect with depth
    float translucency = 0.8 + sin(combined_noise * 4.0 + u_time) * 0.15;
    translucency *= (1.0 - interior_depth * 0.3); // Less translucent in deep areas
    base_color *= translucency;

    return base_color;
}

void main()
{
    vec2 uv = gl_FragCoord.xy;
    vec2 from_center = uv - u_center;
    float dist = length(from_center);

    // Calculate velocity properties - handle platformer movement
    vec2 effective_velocity = u_velocity;
    // Add baseline horizontal movement for platformer world scrolling
    if (abs(effective_velocity.x) < 0.1) {
        effective_velocity.x = 200.0; // Baseline horizontal scroll speed
    }

    // For platformers, we want both horizontal and vertical components
    // The trail should show the combined movement direction

    float vel_magnitude = length(effective_velocity);
    vec2 vel_normalized = vel_magnitude > 0.0 ? normalize(effective_velocity) : vec2(0.0);

    // Direction from center
    vec2 dir = (dist == 0.0) ? vec2(0.0) : from_center / dist;

    // Enhanced jello deformation - more wobbly
    float vel_influence = min(vel_magnitude * 0.008, 0.7);
    float directional_alignment = dot(dir, -vel_normalized);
    float deformation = 1.0 + directional_alignment * vel_influence * 0.6;
    float lateral_factor = 1.0 - abs(dot(dir, vel_normalized));
    deformation += lateral_factor * vel_influence * 0.25;

    // Add jello wobble to deformation
    float jello_wobble = sin(u_time * 3.0 + dist * 0.01) * vel_influence * 0.3;
    deformation += jello_wobble;

    float deformed_dist = dist / deformation;

    // Improved directional trail effect
    float trail_alpha = 0.0;
    vec3 trail_color = vec3(0.0);

    if (vel_magnitude > 0.1) {
        // Trail direction is opposite to movement (world moving, blob stationary)
        vec2 trail_dir = -vel_normalized;

        // Make trail more directional and smoother
        for (int i = 1; i <= 6; i++) {
            float trail_step = float(i);
            float trail_offset = trail_step * u_radius * 0.8; // Longer, more spaced trail
            vec2 trail_center = u_center + trail_dir * trail_offset;
            vec2 from_trail = uv - trail_center;
            float trail_dist = length(from_trail);

            // Progressive radius reduction for smoother trail
            float trail_radius = u_radius * (1.0 - trail_step * 0.12);
            float trail_noise = fbm(from_trail * 0.025 + u_time * 0.4 + trail_step) * 0.3;
            trail_radius += trail_noise * trail_radius * 0.2;

            // Smoother trail alpha with better falloff
            float segment_alpha = smoothstep(trail_radius, trail_radius - 6.0, trail_dist);
            segment_alpha *= (1.0 - trail_step * 0.15); // Smoother falloff
            segment_alpha *= smoothstep(0.1, 2.0, vel_influence * 4.0); // Better velocity response

            if (segment_alpha > 0.0) {
                vec3 segment_color = getJelloColor(uv, trail_dist, trail_noise, effective_velocity, true);

                // Blend trail segments more smoothly
                trail_color = mix(trail_color, segment_color, segment_alpha * (1.0 - trail_alpha * 0.3));
                trail_alpha = max(trail_alpha, segment_alpha * 0.7);
            }
        }
    }

    // Enhanced jello distortion with more wobble
    float distortion_noise = fbm(dir * 3.0 - u_time * 0.25 + vel_normalized * vel_influence * 2.5);
    float turbulence = fbm(from_center * 0.012 + vel_normalized * vel_influence * 1.2 + u_time * 0.15);
    distortion_noise += turbulence * vel_influence * 2.5;

    // Add jello-specific wobbling
    float jello_distortion = sin(u_time * 2.0 + atan(dir.y, dir.x) * 3.0) * 0.15;
    distortion_noise += jello_distortion * (1.0 + vel_influence);

    float distortion_percent = 0.5 + vel_influence * 0.3;
    float distortion_amount = u_radius * distortion_percent;
    float distorted_radius = u_radius + distortion_noise * distortion_amount;

    float velocity_pulse = sin(u_time * 5.0 + vel_magnitude * 0.01) * vel_influence * u_radius * 0.08;
    distorted_radius += velocity_pulse;

    float alpha_main = smoothstep(distorted_radius, distorted_radius - 5.0, deformed_dist);

    // Warm orange outline with depth
    float outline_radius = distorted_radius + 8.0 + vel_influence * u_radius * 0.3;
    float outline_alpha = smoothstep(outline_radius, outline_radius - 3.0, deformed_dist) - alpha_main;

    // Two eyes rendering with lag - flat 2D cartoon style
    vec2 eye_look_direction = length(u_eye_target) > 0.1 ? normalize(u_eye_target) : vec2(1.0, 0.0);

    // Position two eyes symmetrically
    float eye_separation = u_radius * 0.4;
    vec2 eye_base_offset = vec2(0.0, u_radius * 0.2);
    vec2 eye1_center = u_center + eye_base_offset + vec2(-eye_separation * 0.5, 0.0);
    vec2 eye2_center = u_center + eye_base_offset + vec2(eye_separation * 0.5, 0.0);

    float eye_radius = u_radius * 0.15;
    float pupil_radius = eye_radius * 0.5;

    // More frequent blinking for jello character
    float blink = step(0.92, sin(u_time * 1.0) * sin(u_time * 0.7));
    float squint = min(vel_influence * 1.2, 0.3);

    // Eye 1
    vec2 from_eye1 = uv - eye1_center;
    float eye1_dist = length(from_eye1);
    float eye1_alpha = smoothstep(eye_radius, eye_radius - 1.5, eye1_dist);

    // Pupil 1 - moves with lag
    vec2 pupil1_offset = eye_look_direction * eye_radius * 0.4;
    vec2 from_pupil1 = from_eye1 - pupil1_offset;
    float pupil1_dist = length(from_pupil1);
    float pupil1_alpha = smoothstep(pupil_radius, pupil_radius - 1.0, pupil1_dist);

    // Simple highlight 1
    vec2 highlight1_offset = vec2(-eye_radius * 0.3, -eye_radius * 0.3);
    vec2 from_highlight1 = from_eye1 - highlight1_offset;
    float highlight1_dist = length(from_highlight1);
    float highlight1_alpha = smoothstep(eye_radius * 0.2, 0.0, highlight1_dist);

    // Eyelid 1 - simple flat closure
    float eyelid1_y = mix(-eye_radius * 1.2, eye_radius * (0.9 - squint), 1.0 - blink);
    float eyelid1_alpha = smoothstep(eyelid1_y, eyelid1_y - 1.5, from_eye1.y) * eye1_alpha;

    // Eye 2 (same as eye 1 but mirrored)
    vec2 from_eye2 = uv - eye2_center;
    float eye2_dist = length(from_eye2);
    float eye2_alpha = smoothstep(eye_radius, eye_radius - 1.5, eye2_dist);

    // Pupil 2 - moves with lag
    vec2 pupil2_offset = eye_look_direction * eye_radius * 0.4;
    vec2 from_pupil2 = from_eye2 - pupil2_offset;
    float pupil2_dist = length(from_pupil2);
    float pupil2_alpha = smoothstep(pupil_radius, pupil_radius - 1.0, pupil2_dist);

    // Simple highlight 2
    vec2 highlight2_offset = vec2(-eye_radius * 0.3, -eye_radius * 0.3);
    vec2 from_highlight2 = from_eye2 - highlight2_offset;
    float highlight2_dist = length(from_highlight2);
    float highlight2_alpha = smoothstep(eye_radius * 0.2, 0.0, highlight2_dist);

    // Eyelid 2 - simple flat closure
    float eyelid2_y = mix(-eye_radius * 1.2, eye_radius * (0.9 - squint), 1.0 - blink);
    float eyelid2_alpha = smoothstep(eyelid2_y, eyelid2_y - 1.5, from_eye2.y) * eye2_alpha;

    // Compositing
    vec4 final_color = vec4(0.0);

    // Render trail first
    if (trail_alpha > 0.0) {
        final_color = vec4(trail_color, trail_alpha * 0.8);
    }

    // Main blob with warm orange jello properties and depth
    if (alpha_main > 0.0) {
        vec3 blob_color = getJelloColor(uv, deformed_dist, distortion_noise, effective_velocity, false);

        // Enhanced rim lighting with warm tones and depth
        float rim1 = 1.0 - smoothstep(distorted_radius * 0.5, distorted_radius * 0.85, deformed_dist);
        float rim2 = 1.0 - smoothstep(distorted_radius * 0.7, distorted_radius, deformed_dist);
        float rim_intensity = 0.3 + vel_influence * 0.2;

        blob_color += vec3(1.0, 0.7, 0.4) * rim1 * rim1 * rim_intensity; // Warm orange rim light
        blob_color += vec3(1.0, 0.85, 0.6) * rim2 * rim2 * (rim_intensity * 0.7); // Lighter yellow rim

        // Warm jello pulse
        float jello_pulse = sin(u_time * 2.5 + vel_magnitude * 0.015) * 0.1 + 0.9;
        blob_color *= jello_pulse;

        // Depth-based transparency
        float depth_factor = smoothstep(0.0, u_radius * 0.6, deformed_dist);
        float jello_alpha = 0.85 + noise(uv * 0.02 + u_time * 0.2) * 0.1;
        jello_alpha *= (1.0 - depth_factor * 0.2); // More opaque at edges for depth
        alpha_main *= jello_alpha;

        final_color = mix(final_color, vec4(blob_color, 1.0), alpha_main);
    }

    // Eyes rendering - two simple flat eyes
    if ((eye1_alpha > 0.0 || eye2_alpha > 0.0) && alpha_main > 0.3) {
        // Eye 1
        if (eye1_alpha > 0.0) {
            vec3 eye_white = vec3(1.0, 1.0, 1.0);
            final_color.rgb = mix(final_color.rgb, eye_white, eye1_alpha * 0.95);

            if (pupil1_alpha > 0.0) {
                vec3 pupil_color = vec3(0.0, 0.0, 0.0);
                final_color.rgb = mix(final_color.rgb, pupil_color, pupil1_alpha);
            }

            if (highlight1_alpha > 0.0) {
                vec3 highlight_color = vec3(1.0, 1.0, 1.0);
                final_color.rgb = mix(final_color.rgb, highlight_color, highlight1_alpha * 0.6);
            }

            if (eyelid1_alpha > 0.0) {
                vec3 eyelid_color = vec3(0.85, 0.5, 0.25); // Warm orange eyelid
                final_color.rgb = mix(final_color.rgb, eyelid_color, eyelid1_alpha);
            }
        }

        // Eye 2
        if (eye2_alpha > 0.0) {
            vec3 eye_white = vec3(1.0, 1.0, 1.0);
            final_color.rgb = mix(final_color.rgb, eye_white, eye2_alpha * 0.95);

            if (pupil2_alpha > 0.0) {
                vec3 pupil_color = vec3(0.0, 0.0, 0.0);
                final_color.rgb = mix(final_color.rgb, pupil_color, pupil2_alpha);
            }

            if (highlight2_alpha > 0.0) {
                vec3 highlight_color = vec3(1.0, 1.0, 1.0);
                final_color.rgb = mix(final_color.rgb, highlight_color, highlight2_alpha * 0.6);
            }

            if (eyelid2_alpha > 0.0) {
                vec3 eyelid_color = vec3(0.85, 0.5, 0.25); // Warm orange eyelid
                final_color.rgb = mix(final_color.rgb, eyelid_color, eyelid2_alpha);
            }
        }
    }

    // Warm orange outline with depth
    if (outline_alpha > 0.0 && final_color.a < 1.0) {
        float outline_gradient = smoothstep(0.0, 1.0, outline_alpha);
        vec3 outline_color = mix(vec3(0.6, 0.3, 0.1), vec3(0.8, 0.5, 0.2), outline_gradient);

        final_color = mix(final_color, vec4(outline_color, 1.0), outline_alpha * 0.3);
    }

    if (final_color.a > 0.0) {
        finalColor = final_color;
    } else {
        discard;
    }
}
