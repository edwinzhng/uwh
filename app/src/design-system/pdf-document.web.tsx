import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { type ReactElement, useEffect, useRef, useState } from "react";
import { resourceLimits } from "../domain/resources";
import { readBoundedResponse } from "../platform/read-bounded-response";
import { Button } from "./button";
import { Row } from "./row";
import { Stack } from "./stack";
import { Text } from "./text";

export const PdfDocument = ({
	uri,
	label,
}: {
	uri: string;
	label: string;
}): ReactElement => {
	const canvas = useRef<HTMLCanvasElement>(null);
	const [pageNumber, setPageNumber] = useState(1);
	const [attempt, setAttempt] = useState(0);
	const [loaded, setLoaded] = useState<{
		source: string;
		document: PDFDocumentProxy;
	}>();
	const [error, setError] = useState<string>();
	const [rendered, setRendered] = useState<string>();
	const source = `${uri}:${attempt}`;
	useEffect((): (() => void) => {
		const controller = new AbortController();
		const pending: { destroy?: () => Promise<void> } = {};
		setError(undefined);
		setPageNumber(1);
		void Promise.all([
			import("pdfjs-dist"),
			fetch(uri, { signal: controller.signal, credentials: "omit" }).then(
				async (response): Promise<Uint8Array> => {
					const bytes = await readBoundedResponse(
						response,
						resourceLimits.bytes,
					);
					if (new TextDecoder().decode(bytes.subarray(0, 5)) !== "%PDF-")
						throw new Error("Document unavailable.");
					return bytes;
				},
			),
		])
			.then(async ([pdfjs, bytes]): Promise<void> => {
				if (controller.signal.aborted) return;
				pdfjs.GlobalWorkerOptions.workerSrc = `/pdfjs/${pdfjs.version}/pdf.worker.min.mjs`;
				const task = pdfjs.getDocument({
					data: bytes,
					standardFontDataUrl: `/pdfjs/${pdfjs.version}/standard_fonts/`,
					wasmUrl: `/pdfjs/${pdfjs.version}/wasm/`,
				});
				pending.destroy = (): Promise<void> => task.destroy();
				const document = await task.promise;
				if (!controller.signal.aborted) setLoaded({ source, document });
			})
			.catch((): void => {
				if (!controller.signal.aborted)
					setError("Could not preview this PDF. Try again or download it.");
			});
		return (): void => {
			controller.abort();
			void pending.destroy?.();
		};
	}, [source, uri]);
	const renderKey = `${source}:${pageNumber}`;
	useEffect((): (() => void) | undefined => {
		if (loaded?.source !== source || !canvas.current) return undefined;
		const target = canvas.current;
		const pending: { cancelled: boolean; task?: RenderTask } = {
			cancelled: false,
		};
		void loaded.document
			.getPage(pageNumber)
			.then(async (page): Promise<void> => {
				if (pending.cancelled) return;
				const base = page.getViewport({ scale: 1 });
				const width = Math.min(target.parentElement?.clientWidth || 640, 960);
				const viewport = page.getViewport({
					scale:
						Math.min(width / base.width, 2) *
						Math.min(window.devicePixelRatio || 1, 2),
				});
				target.width = Math.ceil(viewport.width);
				target.height = Math.ceil(viewport.height);
				pending.task = page.render({ canvas: target, viewport });
				await pending.task.promise;
				if (!pending.cancelled) setRendered(renderKey);
			})
			.catch((): void => {
				if (!pending.cancelled)
					setError("Could not render this page. Try again or download it.");
			});
		return (): void => {
			pending.cancelled = true;
			pending.task?.cancel();
		};
	}, [loaded, source, pageNumber, renderKey]);
	return (
		<Stack gap="sm">
			{error ? (
				<Stack gap="xs">
					<Text tone="danger">{error}</Text>
					<Button
						label="Retry preview"
						compact
						onPress={(): void => setAttempt((value) => value + 1)}
					/>
				</Stack>
			) : undefined}
			{!error && rendered !== renderKey ? (
				<Text tone="secondary">Loading document…</Text>
			) : undefined}
			<canvas
				ref={canvas}
				role="img"
				aria-label={`${label}, page ${pageNumber}`}
				style={{
					display: !error && rendered === renderKey ? "block" : "none",
					width: "100%",
					height: "auto",
					background: "white",
				}}
			/>
			{loaded?.source === source && loaded.document.numPages > 1 ? (
				<Row justify="between">
					<Button
						label="Previous page"
						compact
						variant="ghost"
						isDisabled={pageNumber <= 1}
						onPress={(): void => setPageNumber((value) => value - 1)}
					/>
					<Text variant="caption">
						{pageNumber} / {loaded.document.numPages}
					</Text>
					<Button
						label="Next page"
						compact
						variant="ghost"
						isDisabled={pageNumber >= loaded.document.numPages}
						onPress={(): void => setPageNumber((value) => value + 1)}
					/>
				</Row>
			) : undefined}
		</Stack>
	);
};
