import { createPuckGeometry, puckPose, puckProjection } from "./puck-geometry";
import {
	puckBackdropFragment,
	puckBackdropVertex,
	puckCopyFragment,
	puckFragment,
	puckVertex,
} from "./puck-shaders";
export type PuckRenderer = {
	draw: (phase: number, dark: boolean) => void;
	dispose: () => void;
};
type Target = {
	framebuffer: WebGLFramebuffer;
	texture: WebGLTexture;
	depth?: WebGLRenderbuffer;
	dispose: () => void;
};
export const createPuckRenderer = (gl: WebGLRenderingContext): PuckRenderer => {
	const compile = (kind: number, source: string): WebGLShader => {
		const shader = gl.createShader(kind);
		if (!shader) throw new Error("Loading puck shader unavailable.");
		gl.shaderSource(shader, source);
		gl.compileShader(shader);
		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			const message = gl.getShaderInfoLog(shader);
			gl.deleteShader(shader);
			throw new Error(message ?? "Loading puck shader could not compile.");
		}
		return shader;
	};
	const program = (vertex: string, fragment: string): WebGLProgram => {
		const shader = gl.createProgram();
		if (!shader) throw new Error("Loading puck renderer unavailable.");
		const vs = compile(gl.VERTEX_SHADER, vertex),
			fs = compile(gl.FRAGMENT_SHADER, fragment);
		gl.attachShader(shader, vs);
		gl.attachShader(shader, fs);
		gl.linkProgram(shader);
		gl.deleteShader(vs);
		gl.deleteShader(fs);
		if (!gl.getProgramParameter(shader, gl.LINK_STATUS)) {
			gl.deleteProgram(shader);
			throw new Error("Loading puck renderer could not link.");
		}
		return shader;
	};
	const target = (
		width: number,
		height: number,
		withDepth: boolean,
	): Target => {
		const framebuffer = gl.createFramebuffer(),
			texture = gl.createTexture();
		if (!framebuffer || !texture)
			throw new Error("Loading puck transmission buffer unavailable.");
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
		const depth = withDepth ? gl.createRenderbuffer() : undefined;
		if (withDepth && !depth)
			throw new Error("Loading puck depth buffer unavailable.");
		if (depth) {
			gl.bindRenderbuffer(gl.RENDERBUFFER, depth);
			gl.renderbufferStorage(
				gl.RENDERBUFFER,
				gl.DEPTH_COMPONENT16,
				width,
				height,
			);
			gl.framebufferRenderbuffer(
				gl.FRAMEBUFFER,
				gl.DEPTH_ATTACHMENT,
				gl.RENDERBUFFER,
				depth,
			);
		}
		if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE)
			throw new Error("Loading puck transmission buffer is incomplete.");
		return {
			framebuffer,
			texture,
			depth: depth ?? undefined,
			dispose: (): void => {
				gl.deleteFramebuffer(framebuffer);
				gl.deleteTexture(texture);
				if (depth) gl.deleteRenderbuffer(depth);
			},
		};
	};
	const backdrop = program(puckBackdropVertex, puckBackdropFragment),
		copy = program(puckBackdropVertex, puckCopyFragment),
		material = program(puckVertex, puckFragment);
	const geometry = createPuckGeometry();
	const quad = gl.createBuffer(),
		vertices = gl.createBuffer(),
		indices = gl.createBuffer();
	if (!quad || !vertices || !indices)
		throw new Error("Loading puck geometry unavailable.");
	gl.bindBuffer(gl.ARRAY_BUFFER, quad);
	gl.bufferData(
		gl.ARRAY_BUFFER,
		new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
		gl.STATIC_DRAW,
	);
	gl.bindBuffer(gl.ARRAY_BUFFER, vertices);
	gl.bufferData(gl.ARRAY_BUFFER, geometry.vertices, gl.STATIC_DRAW);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geometry.indices, gl.STATIC_DRAW);
	const position = gl.getAttribLocation(material, "aPosition"),
		normal = gl.getAttribLocation(material, "aNormal");
	const model = gl.getUniformLocation(material, "uModel"),
		projection = gl.getUniformLocation(material, "uProjection"),
		resolution = gl.getUniformLocation(material, "uResolution"),
		scene = gl.getUniformLocation(material, "uScene"),
		appearance = gl.getUniformLocation(material, "uDark");
	const backdropPosition = gl.getAttribLocation(backdrop, "aPosition"),
		backdropAppearance = gl.getUniformLocation(backdrop, "uDark"),
		copyPosition = gl.getAttribLocation(copy, "aPosition"),
		copyScene = gl.getUniformLocation(copy, "uScene");
	const state: {
		targets?: {
			scene: Target;
			back: Target;
			width: number;
			height: number;
			projection: Float32Array;
		};
		dark?: boolean;
	} = {};
	const activateProgram = gl.useProgram.bind(gl);
	const drawQuad = (shader: WebGLProgram, attribute: number): void => {
		activateProgram(shader);
		gl.disable(gl.DEPTH_TEST);
		gl.disable(gl.CULL_FACE);
		gl.disableVertexAttribArray(normal);
		gl.bindBuffer(gl.ARRAY_BUFFER, quad);
		gl.enableVertexAttribArray(attribute);
		gl.vertexAttribPointer(attribute, 2, gl.FLOAT, false, 0, 0);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	};
	const drawPuck = (
		texture: WebGLTexture,
		back: boolean,
		pose: Float32Array,
		projectionMatrix: Float32Array,
		dark: boolean,
		width: number,
		height: number,
	): void => {
		activateProgram(material);
		gl.enable(gl.DEPTH_TEST);
		gl.depthFunc(gl.LEQUAL);
		gl.enable(gl.CULL_FACE);
		gl.cullFace(back ? gl.FRONT : gl.BACK);
		gl.bindBuffer(gl.ARRAY_BUFFER, vertices);
		gl.enableVertexAttribArray(position);
		gl.vertexAttribPointer(position, 3, gl.FLOAT, false, 24, 0);
		gl.enableVertexAttribArray(normal);
		gl.vertexAttribPointer(normal, 3, gl.FLOAT, false, 24, 12);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.uniform1i(scene, 0);
		gl.uniform2f(resolution, width, height);
		gl.uniform1f(appearance, dark ? 1 : 0);
		gl.uniformMatrix4fv(model, false, pose);
		gl.uniformMatrix4fv(projection, false, projectionMatrix);
		gl.drawElements(
			gl.TRIANGLES,
			geometry.indices.length,
			gl.UNSIGNED_SHORT,
			0,
		);
	};
	return {
		draw: (phase, dark): void => {
			const width = gl.drawingBufferWidth,
				height = gl.drawingBufferHeight;
			if (width < 1 || height < 1) return;
			const changed =
				!state.targets ||
				state.targets.width !== width ||
				state.targets.height !== height;
			if (changed) {
				state.targets?.scene.dispose();
				state.targets?.back.dispose();
				state.targets = {
					scene: target(width, height, false),
					back: target(width, height, true),
					width,
					height,
					projection: puckProjection(width / height),
				};
			}
			const targets = state.targets;
			const pose = puckPose(phase);
			if (!targets) return;
			gl.disable(gl.BLEND);
			gl.viewport(0, 0, width, height);
			gl.clearDepth(1);
			if (changed || state.dark !== dark) {
				gl.bindFramebuffer(gl.FRAMEBUFFER, targets.scene.framebuffer);
				activateProgram(backdrop);
				gl.uniform1f(backdropAppearance, dark ? 1 : 0);
				drawQuad(backdrop, backdropPosition);
				state.dark = dark;
			}
			gl.bindFramebuffer(gl.FRAMEBUFFER, targets.back.framebuffer);
			gl.clear(gl.DEPTH_BUFFER_BIT);
			activateProgram(copy);
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, targets.scene.texture);
			gl.uniform1i(copyScene, 0);
			drawQuad(copy, copyPosition);
			drawPuck(
				targets.scene.texture,
				true,
				pose,
				targets.projection,
				dark,
				width,
				height,
			);
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			gl.clearColor(0, 0, 0, 0);
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
			drawPuck(
				targets.back.texture,
				false,
				pose,
				targets.projection,
				dark,
				width,
				height,
			);
		},
		dispose: (): void => {
			state.targets?.scene.dispose();
			state.targets?.back.dispose();
			gl.deleteBuffer(quad);
			gl.deleteBuffer(vertices);
			gl.deleteBuffer(indices);
			gl.deleteProgram(backdrop);
			gl.deleteProgram(copy);
			gl.deleteProgram(material);
		},
	};
};
