export const buildPushWorker = async (): Promise<void> => {
	const result = await Bun.build({
		entrypoints: ["src/browser/push-worker.ts"],
		outdir: "public",
		naming: "push-worker.js",
		target: "browser",
		format: "iife",
		minify: true,
	});
	if (!result.success)
		throw new AggregateError(
			result.logs,
			"Could not build the browser notification worker.",
		);
};
if (import.meta.main) {
	await buildPushWorker();
	console.log("Browser notification worker built.");
}
