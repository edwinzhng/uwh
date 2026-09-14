import { expect, test } from "bun:test";
import { mkdir, mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildWebExport } from "../scripts/publish-web-export";

const fixture = async (run: (root: string) => Promise<void>): Promise<void> => {
	const root = await mkdtemp(join(tmpdir(), "uwh-web-build-"));
	try {
		await mkdir(join(root, "dist/_expo/static/js/web"), { recursive: true });
		await Bun.write(
			join(root, "dist/index.html"),
			'<script src="/_expo/static/js/web/entry-old.js"></script>',
		);
		await Bun.write(
			join(root, "dist/_expo/static/js/web/entry-old.js"),
			"old entry",
		);
		await Bun.write(
			join(root, "dist/_expo/static/js/web/attendance-old.js"),
			"old lazy chunk",
		);
		await run(root);
	} finally {
		await rm(root, { recursive: true, force: true });
	}
};
test("publishing a new export preserves previous lazy chunks and all new HTML assets exist", async () => {
	await fixture(async (root): Promise<void> => {
		await buildWebExport(root, async (staging): Promise<number> => {
			await Bun.write(
				join(staging, "_expo/static/js/web/entry-new.js"),
				"new entry",
			);
			await Bun.write(
				join(staging, "_expo/static/js/web/attendance-new.js"),
				"new lazy chunk",
			);
			await Bun.write(join(staging, "assets/new.css"), "body {}");
			await Bun.write(
				join(staging, "index.html"),
				'<link href="/assets/new.css"><script src="/_expo/static/js/web/entry-new.js"></script>',
			);
			return 0;
		});
		expect(
			await Bun.file(
				join(root, "dist/_expo/static/js/web/attendance-old.js"),
			).text(),
		).toBe("old lazy chunk");
		expect(
			await Bun.file(
				join(root, "dist/_expo/static/js/web/entry-old.js"),
			).text(),
		).toBe("old entry");
		expect(await Bun.file(join(root, "dist/index.html")).text()).toContain(
			"entry-new.js",
		);
		expect(
			await Bun.file(
				join(root, "dist/_expo/static/js/web/entry-new.js"),
			).text(),
		).toBe("new entry");
		expect(await Bun.file(join(root, "dist/assets/new.css")).exists()).toBe(
			true,
		);
		expect(await readdir(join(root, ".expo"))).toEqual([]);
	});
});
test("failed exporter leaves the served build unchanged even after writing staged HTML", async () => {
	await fixture(async (root): Promise<void> => {
		const before = await Bun.file(join(root, "dist/index.html")).text();
		await expect(
			buildWebExport(root, async (staging): Promise<number> => {
				await Bun.write(join(staging, "index.html"), "broken staging");
				return 1;
			}),
		).rejects.toThrow("Existing build kept");
		expect(await Bun.file(join(root, "dist/index.html")).text()).toBe(before);
		expect(
			await Bun.file(
				join(root, "dist/_expo/static/js/web/attendance-old.js"),
			).text(),
		).toBe("old lazy chunk");
		expect(await readdir(join(root, ".expo"))).toEqual([]);
	});
});
test("incomplete successful export is rejected before any served file is changed", async () => {
	await fixture(async (root): Promise<void> => {
		const before = await Bun.file(join(root, "dist/index.html")).text();
		await expect(
			buildWebExport(root, async (staging): Promise<number> => {
				await Bun.write(
					join(staging, "index.html"),
					'<script src="/_expo/missing.js"></script>',
				);
				return 0;
			}),
		).rejects.toThrow("missing asset");
		expect(await Bun.file(join(root, "dist/index.html")).text()).toBe(before);
	});
});
