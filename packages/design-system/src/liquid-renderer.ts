import { fragmentShader, vertexShader } from "./liquid-shaders";
export const liquidDefaults = {
	radius: 110,
	distortion: 0.22,
	noiseScale: 5.7,
	speed: 0.22,
	edgeSoftness: 0.025,
	refraction: 0.085,
	parallax: 0.004,
	mouseSmoothness: 0.12,
	trailLength: 0.65,
	trailPersistence: 0.16,
	trailTaper: 0.92,
} as const;
export type LiquidRenderer = {
	resize: (width: number, height: number) => void;
	render: (time: number, visibility: number, points: Float32Array) => void;
	dispose: () => void;
};
export const createLiquidRenderer = (
	canvas: HTMLCanvasElement,
	shape: "cursor" | "button" = "cursor",
	imageSrc = "/hockey-action.webp",
): LiquidRenderer | undefined => {
	const gl = canvas.getContext("webgl", {
		alpha: true,
		antialias: false,
		premultipliedAlpha: false,
		preserveDrawingBuffer: true,
		powerPreference: "low-power",
	});
	if (!gl) return;
	const compile = (type: number, source: string): WebGLShader | undefined => {
		const shader = gl.createShader(type);
		if (!shader) return;
		gl.shaderSource(shader, source);
		gl.compileShader(shader);
		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			gl.deleteShader(shader);
			return;
		}
		return shader;
	};
	const vertex = compile(gl.VERTEX_SHADER, vertexShader);
	const buttonShader = fragmentShader
		.replace(
			"float field = liquidField.x - u_radius * (n - 0.5) * u_distortion * 2.0;",
			"liquidField = taperedCapsule(p, vec2(-max(aspect.x * 0.5 - 0.5, 0.0), 0.0), vec2(max(aspect.x * 0.5 - 0.5, 0.0), 0.0), 0.43, 0.43); float field = liquidField.x - (n - 0.5) * 0.025;",
		)
		.replace(
			"gl_FragColor = vec4(finalCol.rgb, mask * u_visibility);",
			"gl_FragColor = vec4(mix(finalCol.rgb, vec3(0.933, 0.957, 0.945), 0.78), mask * u_visibility);",
		);
	const fragment = compile(
		gl.FRAGMENT_SHADER,
		shape === "button" ? buttonShader : fragmentShader,
	);
	const program = gl.createProgram();
	if (!vertex || !fragment || !program) {
		if (vertex) gl.deleteShader(vertex);
		if (fragment) gl.deleteShader(fragment);
		if (program) gl.deleteProgram(program);
		return;
	}
	gl.attachShader(program, vertex);
	gl.attachShader(program, fragment);
	gl.linkProgram(program);
	gl.deleteShader(vertex);
	gl.deleteShader(fragment);
	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		gl.deleteProgram(program);
		return;
	}
	const activateProgram = gl.useProgram.bind(gl);
	activateProgram(program);
	const buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
	gl.bufferData(
		gl.ARRAY_BUFFER,
		new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
		gl.STATIC_DRAW,
	);
	const position = gl.getAttribLocation(program, "position");
	gl.enableVertexAttribArray(position);
	gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
	const location = (name: string): WebGLUniformLocation | null =>
		gl.getUniformLocation(program, name);
	const uniforms = {
		resolution: location("u_resolution"),
		radius: location("u_radius"),
		time: location("u_time"),
		visibility: location("u_visibility"),
		mouse: location("u_mouse"),
		trail: location("u_trail[0]"),
	};
	const settings = {
		u_distortion: liquidDefaults.distortion,
		u_noiseScale: liquidDefaults.noiseScale,
		u_speed: liquidDefaults.speed,
		u_edgeSoftness: liquidDefaults.edgeSoftness,
		u_refraction: liquidDefaults.refraction,
		u_parallax: liquidDefaults.parallax,
		u_trailLength: liquidDefaults.trailLength,
		u_trailTaper: liquidDefaults.trailTaper,
	};
	for (const [name, value] of Object.entries(settings))
		gl.uniform1f(location(name), value);
	const texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	const state = { ready: false, disposed: false, width: 1, height: 1 };
	const photo = new Image();
	photo.onload = (): void => {
		if (state.disposed) return;
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, photo);
		gl.uniform2f(
			location("u_imageOuterRes"),
			photo.naturalWidth,
			photo.naturalHeight,
		);
		gl.uniform2f(
			location("u_imageInnerRes"),
			photo.naturalWidth,
			photo.naturalHeight,
		);
		gl.uniform1i(location("u_imageOuter"), 0);
		gl.uniform1i(location("u_imageInner"), 0);
		state.ready = true;
	};
	photo.crossOrigin = "anonymous";
	photo.src = imageSrc;
	return {
		resize: (width, height): void => {
			const ratio = Math.min(window.devicePixelRatio, 1.5);
			const pixelWidth = Math.round(width * ratio);
			const pixelHeight = Math.round(height * ratio);
			if (
				state.width === width &&
				state.height === height &&
				canvas.width === pixelWidth &&
				canvas.height === pixelHeight
			)
				return;
			state.width = width;
			state.height = height;
			canvas.width = pixelWidth;
			canvas.height = pixelHeight;
			gl.viewport(0, 0, canvas.width, canvas.height);
			gl.uniform2f(uniforms.resolution, width, height);
			gl.uniform1f(uniforms.radius, liquidDefaults.radius / height);
		},
		render: (time, visibility, points): void => {
			gl.disable(gl.SCISSOR_TEST);
			gl.clear(gl.COLOR_BUFFER_BIT);
			if (!state.ready) return;
			gl.uniform1f(uniforms.time, time);
			gl.uniform1f(uniforms.visibility, visibility);
			gl.uniform2f(uniforms.mouse, points.at(0) ?? 0.5, points.at(1) ?? 0.5);
			gl.uniform2fv(uniforms.trail, points);
			const xs = Array.from(points).filter((_, index) => index % 2 === 0);
			const ys = Array.from(points).filter((_, index) => index % 2 === 1);
			const padding =
				liquidDefaults.radius * 1.5 +
				state.height * liquidDefaults.edgeSoftness;
			const ratio = canvas.width / state.width;
			const left = Math.max(0, Math.min(...xs) * state.width - padding);
			const bottom = Math.max(0, Math.min(...ys) * state.height - padding);
			const right = Math.min(
				state.width,
				Math.max(...xs) * state.width + padding,
			);
			const top = Math.min(
				state.height,
				Math.max(...ys) * state.height + padding,
			);
			gl.enable(gl.SCISSOR_TEST);
			gl.scissor(
				Math.floor(left * ratio),
				Math.floor(bottom * ratio),
				Math.ceil((right - left) * ratio),
				Math.ceil((top - bottom) * ratio),
			);
			gl.drawArrays(gl.TRIANGLES, 0, 6);
		},
		dispose: (): void => {
			state.disposed = true;
			photo.onload = null;
			gl.deleteTexture(texture);
			gl.deleteBuffer(buffer);
			gl.deleteProgram(program);
		},
	};
};
