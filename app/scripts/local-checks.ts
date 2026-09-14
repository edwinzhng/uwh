import assert from "node:assert/strict";
import type {
	FunctionArgs,
	FunctionReference,
	FunctionReturnType,
} from "convex/server";
export const localRun = async <
	Reference extends FunctionReference<
		"query" | "mutation" | "action",
		"internal"
	>,
>(
	name: string,
	_reference: Reference,
	args: FunctionArgs<Reference>,
): Promise<FunctionReturnType<Reference>> => {
	const process = Bun.spawn(
		[
			Bun.argv.at(0) ?? "bun",
			"scripts/local-convex.ts",
			"run",
			name,
			JSON.stringify(args),
		],
		{ stdout: "pipe", stderr: "pipe" },
	);
	const output = await new Response(process.stdout).text();
	assert.equal(
		await process.exited,
		0,
		await new Response(process.stderr).text(),
	);
	return JSON.parse(output.trim() || "null");
};
