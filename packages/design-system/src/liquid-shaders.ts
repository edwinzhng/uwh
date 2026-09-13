export const vertexShader = `attribute vec2 position; varying vec2 vUv; void main() { vUv = position * 0.5 + 0.5; gl_Position = vec4(position, 0.0, 1.0); }`;
export const fragmentShader = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
            uniform sampler2D u_imageOuter;
            uniform sampler2D u_imageInner;
            uniform vec2 u_resolution;
            uniform vec2 u_imageOuterRes;
            uniform vec2 u_imageInnerRes;
            
            uniform vec2 u_mouse;
            uniform float u_time;
            uniform float u_visibility;
            uniform vec2 u_trail[12];
            uniform float u_trailLength;
            uniform float u_trailTaper;
            
            uniform float u_radius;
            uniform float u_distortion;
            uniform float u_noiseScale;
            uniform float u_speed;
            uniform float u_edgeSoftness;
            uniform float u_refraction;
            uniform float u_parallax;

            varying vec2 vUv;

            
            float hash(vec2 p) {
                p = fract(p * vec2(123.34, 456.21));
                p += dot(p, p + 45.32);
                return fract(p.x * p.y);
            }

            float noise(vec2 p) {
                vec2 i = floor(p);
                vec2 f = fract(p);
                f = f * f * (3.0 - 2.0 * f);
                float a = hash(i);
                float b = hash(i + vec2(1.0, 0.0));
                float c = hash(i + vec2(0.0, 1.0));
                float d = hash(i + vec2(1.0, 1.0));
                return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
            }

            float fbm(vec2 p) {
                float v = 0.0;
                float a = 0.5;
                
                mat2 rot = mat2(0.87, -0.48, 0.48, 0.87); 
                for (int i = 0; i < 4; i++) {
                    v += a * noise(p);
                    p = rot * p * 2.0;
                    a *= 0.5;
                }
                return v;
            }

            
            vec3 taperedCapsule(vec2 p, vec2 a, vec2 b, float ra, float rb) {
                vec2 segment = b - a;
                float segmentLength = length(segment);
                float radiusDelta = rb - ra;
                if (segmentLength <= abs(radiusDelta) + 0.00001) {
                    vec2 offset = p - (ra >= rb ? a : b);
                    float distanceToCenter = length(offset);
                    return vec3(distanceToCenter - max(ra, rb), offset / max(distanceToCenter, 0.00001));
                }
                vec2 axis = segment / segmentLength;
                vec2 relative = p - a;
                float along = dot(relative, axis);
                vec2 perpendicular = relative - axis * along;
                float slope = radiusDelta / segmentLength;
                float tangent = sqrt(max(1.0 - slope * slope, 0.000001));
                float h = clamp((along + slope * length(perpendicular) / tangent) / segmentLength, 0.0, 1.0);
                vec2 offset = relative - segment * h;
                float distanceToCenter = length(offset);
                return vec3(distanceToCenter - mix(ra, rb, h), offset / max(distanceToCenter, 0.00001));
            }

            
            vec3 mergeFields(vec3 a, vec3 b, float width) {
                if (width < 0.000001) return a.x < b.x ? a : b;
                float h = clamp(0.5 + 0.5 * (b.x - a.x) / width, 0.0, 1.0);
                return vec3(mix(b.x, a.x, h) - width * h * (1.0 - h), mix(b.yz, a.yz, h));
            }

            
            vec2 getCoverUv(vec2 uv, vec2 res, vec2 texRes) {
                vec2 ratio = res / texRes;
                float coverRatio = max(ratio.x, ratio.y);
                vec2 scaledRes = texRes * coverRatio;
                vec2 offset = (scaledRes - res) * vec2(0.5, 0.42) / scaledRes;
                return uv * (res / scaledRes) + offset;
            }

            void main() {
                
                vec3 fallbackOut = mix(vec3(0.05, 0.05, 0.08), vec3(0.15, 0.2, 0.3), vUv.y);
                vec3 fallbackIn = mix(vec3(0.9, 0.2, 0.4), vec3(0.1, 0.8, 0.9), vUv.x);

                vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);
                vec2 p = (vUv - u_mouse) * aspect;

                
                float n = fbm(p * u_noiseScale + u_time * u_speed);
                
                
                vec3 liquidField = vec3(length(p) - u_radius, p / max(length(p), 0.00001));
                for (int i = 0; i < 11; i++) {
                    vec2 a = (u_trail[i] - u_mouse) * aspect * u_trailLength;
                    vec2 b = (u_trail[i + 1] - u_mouse) * aspect * u_trailLength;
                    float ra = u_radius * (1.0 - u_trailTaper * float(i) / 11.0);
                    float rb = u_radius * (1.0 - u_trailTaper * float(i + 1) / 11.0);
                    vec3 segmentField = taperedCapsule(p, a, b, ra, rb);
                    float blendWidth = u_radius * 0.12 * smoothstep(0.0, u_radius * 0.15, length(b - a));
                    liquidField = mergeFields(liquidField, segmentField, blendWidth);
                }
                float field = liquidField.x - u_radius * (n - 0.5) * u_distortion * 2.0;
                float mask = 1.0 - smoothstep(-u_edgeSoftness, u_edgeSoftness, field);
                float alpha = mask * u_visibility;
                if (alpha <= 0.001) discard;
                float edgeProfile = smoothstep(0.0, 0.5, mask) * (1.0 - smoothstep(0.5, 1.0, mask));
                
                vec2 refractionDir = liquidField.yz;
                vec2 finalUvOffset = refractionDir * edgeProfile * u_refraction * u_visibility;

                
                vec4 colOuter = vec4(fallbackOut, 1.0);
                if (u_imageOuterRes.x > 0.0) {
                    vec2 outerUv = getCoverUv(vUv + finalUvOffset, u_resolution, u_imageOuterRes);
                    colOuter = texture2D(u_imageOuter, outerUv);
                }

                vec4 colInner = vec4(fallbackIn, 1.0);
                if (u_imageInnerRes.x > 0.0) {
                    vec2 parallaxOffset = (u_mouse - 0.5) * u_parallax;
                    vec2 innerUv = getCoverUv(vUv - finalUvOffset, u_resolution, u_imageInnerRes) + parallaxOffset;
                    colInner = texture2D(u_imageInner, innerUv);
                }

                
                vec4 finalCol = mix(colOuter, colInner, mask * u_visibility);
                
                gl_FragColor = vec4(finalCol.rgb * alpha, alpha);
            }
        `;
