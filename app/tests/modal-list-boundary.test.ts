import { expect, test } from "bun:test";
import { fileURLToPath } from "node:url";

test("web modal lists do not inherit their parent message-list context", async (): Promise<void> => {
	const built = await Bun.build({
		entrypoints: ["tests/fixtures/modal-list-smoke.tsx"],
		target: "bun",
		format: "esm",
		plugins: [
			{
				name: "web-native-exports",
				setup(build): void {
					build.onResolve({ filter: /^react-native$/ }, () => ({
						path: fileURLToPath(import.meta.resolve("react-native-web")),
					}));
				},
			},
		],
	});
	expect(built.success).toBe(true);
	const artifact = built.outputs.at(0);
	if (!artifact) throw new Error("Modal list fixture did not compile");
	const fixture = await import(
		`data:text/javascript;base64,${Buffer.from(await artifact.text()).toString("base64")}`
	);
	expect(fixture.modalListSmoke()).toEqual({
		inherited: "nested",
		isolated: "independent",
	});
});
