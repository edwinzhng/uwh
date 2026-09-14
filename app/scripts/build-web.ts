import { resolve } from "node:path";
import { buildWebExport } from "./publish-web-export";

const root = resolve(import.meta.dir, "..");
await buildWebExport(root, async (staging): Promise<number> => {
	const child = Bun.spawn(
		[
			process.execPath,
			"x",
			"expo",
			"export",
			"--platform",
			"web",
			"--max-workers",
			"2",
			"--output-dir",
			staging,
		],
		{ cwd: root, stdout: "inherit", stderr: "inherit" },
	);
	return child.exited;
});
console.log(
	"Web build published to dist; existing lazy assets retained for open tabs.",
);
