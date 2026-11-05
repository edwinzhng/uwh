import { watercolorFragment } from "./watercolor-fragment";
import { watercolorRenderSize } from "./watercolor-render-size";

export type WatercolorFrame = {
	time: number;
	seed: number;
	grain: number;
	smoothness: number;
	base: string;
	pigment: string;
	ground: string;
};
type Target = {
	framebuffer: WebGLFramebuffer;
	texture: WebGLTexture;
	width: number;
	height: number;
};

export const createWatercolorRenderer = (
	gl: WebGLRenderingContext,
): { draw: (frame: WatercolorFrame) => void; dispose: () => void } => {
	const compile = (kind: number, source: string): WebGLShader => {
		const shader = gl.createShader(kind);
		if (!shader) throw new Error("Watercolor shader unavailable.");
		gl.shaderSource(shader, source);
		gl.compileShader(shader);
		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			const message = gl.getShaderInfoLog(shader);
			gl.deleteShader(shader);
			throw new Error(message ?? "Watercolor shader could not compile.");
		}
		return shader;
	};
	const program = (fragmentSource: string): WebGLProgram => {
		const shader = gl.createProgram();
		if (!shader) throw new Error("Watercolor renderer unavailable.");
		const vertex = compile(
			gl.VERTEX_SHADER,
			"attribute vec2 position; varying vec2 uv; void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}",
		);
		const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
		gl.attachShader(shader, vertex);
		gl.attachShader(shader, fragment);
		gl.linkProgram(shader);
		gl.deleteShader(vertex);
		gl.deleteShader(fragment);
		if (!gl.getProgramParameter(shader, gl.LINK_STATUS)) {
			gl.deleteProgram(shader);
			throw new Error("Watercolor shader could not link.");
		}
		return shader;
	};
	const material = program(
		watercolorFragment
			.replace("#version 300 es", "")
			.replace("out vec4 fragColor;", "")
			.replace("fragColor=", "gl_FragColor="),
	);
	const copy = program(
		"precision highp float; varying vec2 uv; uniform sampler2D image; uniform float grain; uniform float seed; void main(){float paper=fract(sin(dot(floor(gl_FragCoord.xy),vec2(12.9898,78.233))+seed)*43758.5453)-.5;gl_FragColor=vec4(clamp(texture2D(image,uv).rgb+paper*grain*.18,0.,1.),1.);}",
	);
	const buffer = gl.createBuffer();
	if (!buffer) throw new Error("Watercolor geometry unavailable.");
	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
	gl.bufferData(
		gl.ARRAY_BUFFER,
		new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
		gl.STATIC_DRAW,
	);
	const materialPosition = gl.getAttribLocation(material, "position");
	const copyPosition = gl.getAttribLocation(copy, "position");
	const image = gl.getUniformLocation(copy, "image");
	const outputGrain = gl.getUniformLocation(copy, "grain");
	const outputSeed = gl.getUniformLocation(copy, "seed");
	const uniforms = Object.fromEntries(
		[
			"resolution",
			"time",
			"seed",
			"grain",
			"smoothness",
			"base",
			"pigment",
			"ground",
		].map((name) => [name, gl.getUniformLocation(material, `u_${name}`)]),
	);
	const state: { target?: Target } = {};
	const discardTarget = (): void => {
		if (!state.target) return;
		gl.deleteFramebuffer(state.target.framebuffer);
		gl.deleteTexture(state.target.texture);
		state.target = undefined;
	};
	const target = (width: number, height: number): Target => {
		if (state.target?.width === width && state.target.height === height)
			return state.target;
		discardTarget();
		const framebuffer = gl.createFramebuffer();
		const texture = gl.createTexture();
		if (!framebuffer || !texture)
			throw new Error("Watercolor surface unavailable.");
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texImage2D(
			gl.TEXTURE_2D,
			0,
			gl.RGBA,
			width,
			height,
			0,
			gl.RGBA,
			gl.UNSIGNED_BYTE,
			null,
		);
		gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
		gl.framebufferTexture2D(
			gl.FRAMEBUFFER,
			gl.COLOR_ATTACHMENT0,
			gl.TEXTURE_2D,
			texture,
			0,
		);
		if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE)
			throw new Error("Watercolor surface is incomplete.");
		state.target = { framebuffer, texture, width, height };
		return state.target;
	};
	const activateProgram = gl.useProgram.bind(gl);
	const quad = (shader: WebGLProgram, position: number): void => {
		activateProgram(shader);
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
		gl.enableVertexAttribArray(position);
		gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
	};
	const color = (name: string, hex: string): void =>
		gl.uniform3f(
			uniforms[name] ?? null,
			Number.parseInt(hex.slice(1, 3), 16) / 255,
			Number.parseInt(hex.slice(3, 5), 16) / 255,
			Number.parseInt(hex.slice(5, 7), 16) / 255,
		);
	return {
		draw: (frame): void => {
			const width = gl.drawingBufferWidth;
			const height = gl.drawingBufferHeight;
			if (width < 1 || height < 1) return;
			const size = watercolorRenderSize(width, height);
			const surface = target(size.width, size.height);
			gl.disable(gl.SCISSOR_TEST);
			gl.disable(gl.DEPTH_TEST);
			gl.disable(gl.BLEND);
			gl.bindFramebuffer(gl.FRAMEBUFFER, surface.framebuffer);
			gl.viewport(0, 0, surface.width, surface.height);
			quad(material, materialPosition);
			gl.uniform2f(uniforms.resolution ?? null, surface.width, surface.height);
			gl.uniform1f(uniforms.time ?? null, frame.time);
			gl.uniform1f(uniforms.seed ?? null, frame.seed);
			gl.uniform1f(uniforms.grain ?? null, 0);
			gl.uniform1f(uniforms.smoothness ?? null, frame.smoothness);
			color("base", frame.base);
			color("pigment", frame.pigment);
			color("ground", frame.ground);
			gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			gl.viewport(0, 0, width, height);
			quad(copy, copyPosition);
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, surface.texture);
			gl.uniform1i(image, 0);
			gl.uniform1f(outputGrain, frame.grain);
			gl.uniform1f(outputSeed, frame.seed);
			gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
		},
		dispose: (): void => {
			discardTarget();
			gl.deleteBuffer(buffer);
			gl.deleteProgram(material);
			gl.deleteProgram(copy);
		},
	};
};
