import {
	liquidFieldFragment,
	liquidShadeFragment,
	liquidVertex,
} from "./liquid-bubble-shaders";

export type LiquidBubbleRenderer = {
	draw: (
		data: Float32Array,
		count: number,
		width: number,
		height: number,
		dark: boolean,
	) => void;
	dispose: () => void;
};
export const createLiquidBubbleRenderer = (
	gl: WebGLRenderingContext,
): LiquidBubbleRenderer => {
	const program = (source: string): WebGLProgram => {
		const result = gl.createProgram();
		if (!result) throw new Error("Liquid glass program unavailable");
		for (const [kind, code] of [
			[gl.VERTEX_SHADER, liquidVertex],
			[gl.FRAGMENT_SHADER, source],
		] as const) {
			const shader = gl.createShader(kind);
			if (!shader) throw new Error("Liquid glass shader unavailable");
			gl.shaderSource(shader, code);
			gl.compileShader(shader);
			if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
				throw new Error(
					gl.getShaderInfoLog(shader) ?? "Liquid glass shader failed",
				);
			gl.attachShader(result, shader);
			gl.deleteShader(shader);
		}
		gl.linkProgram(result);
		if (!gl.getProgramParameter(result, gl.LINK_STATUS))
			throw new Error(
				gl.getProgramInfoLog(result) ?? "Liquid glass program failed",
			);
		return result;
	};
	const field = program(liquidFieldFragment),
		shade = program(liquidShadeFragment);
	const buffer = gl.createBuffer(),
		texture = gl.createTexture(),
		framebuffer = gl.createFramebuffer();
	if (!buffer || !texture || !framebuffer)
		throw new Error("Liquid glass buffers unavailable");
	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
	gl.bufferData(
		gl.ARRAY_BUFFER,
		new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
		gl.STATIC_DRAW,
	);
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
	gl.framebufferTexture2D(
		gl.FRAMEBUFFER,
		gl.COLOR_ATTACHMENT0,
		gl.TEXTURE_2D,
		texture,
		0,
	);
	const uniforms = {
		fieldSize: gl.getUniformLocation(field, "uSize"),
		count: gl.getUniformLocation(field, "uCount"),
		bodies: gl.getUniformLocation(field, "uBodies[0]"),
		size: gl.getUniformLocation(shade, "uSize"),
		texel: gl.getUniformLocation(shade, "uTexel"),
		dark: gl.getUniformLocation(shade, "uDark"),
		texture: gl.getUniformLocation(shade, "uField"),
	};
	const positions = {
		field: gl.getAttribLocation(field, "aPosition"),
		shade: gl.getAttribLocation(shade, "aPosition"),
	};
	const activate = gl.useProgram.bind(gl);
	const state = { width: 0, height: 0 };
	const quad = (location: number): void => {
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
		gl.enableVertexAttribArray(location);
		gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	};
	return {
		draw: (data, count, width, height, dark): void => {
			if (width < 1 || height < 1) return;
			const scale = Math.min(
				2,
				gl.drawingBufferWidth / width,
				gl.drawingBufferHeight / height,
			);
			const fieldWidth = Math.max(1, Math.ceil(width * scale)),
				fieldHeight = Math.max(1, Math.ceil(height * scale));
			gl.disable(gl.DEPTH_TEST);
			gl.disable(gl.CULL_FACE);
			gl.disable(gl.BLEND);
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, texture);
			if (fieldWidth !== state.width || fieldHeight !== state.height) {
				state.width = fieldWidth;
				state.height = fieldHeight;
				gl.texImage2D(
					gl.TEXTURE_2D,
					0,
					gl.RGBA,
					fieldWidth,
					fieldHeight,
					0,
					gl.RGBA,
					gl.UNSIGNED_BYTE,
					null,
				);
				gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
				if (
					gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE
				)
					throw new Error("Liquid glass field buffer incomplete");
			}
			gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
			gl.viewport(0, 0, fieldWidth, fieldHeight);
			activate(field);
			gl.uniform2f(uniforms.fieldSize, width, height);
			gl.uniform1i(uniforms.count, count);
			gl.uniform4fv(uniforms.bodies, data);
			quad(positions.field);
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
			activate(shade);
			gl.bindTexture(gl.TEXTURE_2D, texture);
			gl.uniform1i(uniforms.texture, 0);
			gl.uniform2f(uniforms.size, width, height);
			gl.uniform2f(uniforms.texel, 1 / fieldWidth, 1 / fieldHeight);
			gl.uniform1f(uniforms.dark, dark ? 1 : 0);
			quad(positions.shade);
		},
		dispose: (): void => {
			gl.deleteBuffer(buffer);
			gl.deleteTexture(texture);
			gl.deleteFramebuffer(framebuffer);
			gl.deleteProgram(field);
			gl.deleteProgram(shade);
		},
	};
};
