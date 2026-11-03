import { expect, test } from "bun:test";
import { runInNewContext } from "node:vm";
import { nativeRuntimeSmoke } from "./fixtures/native-runtime-smoke";

test("Home, participant selection, chart and rich selection run without newer Hermes methods", async (): Promise<void> => {
	const built = await Bun.build({
		entrypoints: ["tests/fixtures/native-runtime-smoke.ts"],
		target: "browser",
		format: "cjs",
	});
	expect(built.success).toBe(true);
	const artifact = built.outputs.at(0);
	expect(artifact).toBeDefined();
	if (!artifact)
		throw new Error("Native compatibility fixture did not compile");
	const result: ReturnType<typeof nativeRuntimeSmoke> = runInNewContext(
		`class RuntimeURL extends NativeURL {}
Object.defineProperty(RuntimeURL, "canParse", { value: undefined });
const URL = RuntimeURL;
Array.prototype.toSorted = undefined;
Array.prototype.toReversed = undefined;
Array.prototype.toSpliced = undefined;
Array.prototype.findLast = undefined;
Array.prototype.findLastIndex = undefined;
Object.hasOwn = undefined;
${await artifact.text()}
module.exports.nativeRuntimeSmoke();`,
		{ module: { exports: {} }, console, NativeURL: URL },
	);
	expect(JSON.parse(JSON.stringify(result))).toEqual(nativeRuntimeSmoke());
	expect(result.coaching).toBe(true);
	expect(result.events).toBeGreaterThan(0);
	expect(result.immutable).toBe(true);
	expect(result.rounded).toBe(true);
	expect(result.resource).toBe(true);
});
