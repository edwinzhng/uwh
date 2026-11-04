import { watercolorFragment } from "./watercolor-fragment";

export type WatercolorFrame = {
	time: number;
	seed: number;
	grain: number;
	smoothness: number;
	base: string;
	pigment: string;
	ground: string;
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
	const vertex = compile(
		gl.VERTEX_SHADER,
		"attribute vec2 position; void main(){gl_Position=vec4(position,0.,1.);}",
	);
	const fragment = compile(
		gl.FRAGMENT_SHADER,
		watercolorFragment
			.replace("#version 300 es", "")
			.replace("out vec4 fragColor;", "")
			.replace("fragColor=", "gl_FragColor="),
	);
	const program = gl.createProgram();
	const buffer = gl.createBuffer();
	if (!program || !buffer) throw new Error("Watercolor renderer unavailable.");
	gl.attachShader(program, vertex);
	gl.attachShader(program, fragment);
	gl.linkProgram(program);
	gl.deleteShader(vertex);
	gl.deleteShader(fragment);
	if (!gl.getProgramParameter(program, gl.LINK_STATUS))
		throw new Error("Watercolor shader could not link.");
	gl.useProgram(program);
	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
	gl.bufferData(
		gl.ARRAY_BUFFER,
		new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
		gl.STATIC_DRAW,
	);
	const position = gl.getAttribLocation(program, "position");
	gl.enableVertexAttribArray(position);
	gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
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
		].map((name) => [name, gl.getUniformLocation(program, `u_${name}`)]),
	);
	const color = (name: string, hex: string): void =>
		gl.uniform3f(
			uniforms[name] ?? null,
			Number.parseInt(hex.slice(1, 3), 16) / 255,
			Number.parseInt(hex.slice(3, 5), 16) / 255,
			Number.parseInt(hex.slice(5, 7), 16) / 255,
		);
	return {
		draw: (frame): void => {
			gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
			gl.uniform2f(
				uniforms.resolution ?? null,
				gl.drawingBufferWidth,
				gl.drawingBufferHeight,
			);
			gl.uniform1f(uniforms.time ?? null, frame.time);
			gl.uniform1f(uniforms.seed ?? null, frame.seed);
			gl.uniform1f(uniforms.grain ?? null, frame.grain);
			gl.uniform1f(uniforms.smoothness ?? null, frame.smoothness);
			color("base", frame.base);
			color("pigment", frame.pigment);
			color("ground", frame.ground);
			gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
		},
		dispose: (): void => {
			gl.deleteBuffer(buffer);
			gl.deleteProgram(program);
		},
	};
};
