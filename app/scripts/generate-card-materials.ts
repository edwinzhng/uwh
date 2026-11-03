import { mkdir } from "node:fs/promises";
import { deflateSync } from "node:zlib";
import { materialCategories, materialPixel } from "./card-material-field";

const size = 256;
const crc = (data: Uint8Array): number => {
	const value = data.reduce((previous, byte) => {
		const initial = previous ^ byte;
		return Array.from({ length: 8 }).reduce<number>(
			(current) => (current >>> 1) ^ (current & 1 ? 0xedb88320 : 0),
			initial,
		);
	}, 0xffffffff);
	return (value ^ 0xffffffff) >>> 0;
};
const chunk = (type: string, data: Uint8Array): Buffer => {
	const body = Buffer.concat([Buffer.from(type), data]);
	const length = Buffer.alloc(4);
	length.writeUInt32BE(data.length);
	const checksum = Buffer.alloc(4);
	checksum.writeUInt32BE(crc(body));
	return Buffer.concat([length, body, checksum]);
};
const directory = `${import.meta.dir}/../assets/materials`;
await mkdir(directory, { recursive: true });
for (const style of ["pastel", "watercolor"] as const) {
	for (const category of materialCategories) {
		for (const mode of ["light", "dark"] as const) {
			for (const phase of [0, 1] as const) {
				const pixels = Buffer.concat(
					Array.from({ length: size }, (_, y) =>
						Buffer.from([
							0,
							...Array.from({ length: size }, (_, x) =>
								materialPixel(
									style,
									mode,
									x / size,
									y / size,
									phase * 1.8,
									category,
								),
							).flat(),
						]),
					),
				);
				const header = Buffer.alloc(13);
				header.writeUInt32BE(size, 0);
				header.writeUInt32BE(size, 4);
				header.writeUInt8(8, 8);
				header.writeUInt8(2, 9);
				await Bun.write(
					`${directory}/${style}-${category}-${mode}-${phase}.png`,
					Buffer.concat([
						Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
						chunk("IHDR", header),
						chunk("IDAT", deflateSync(pixels)),
						chunk("IEND", Buffer.alloc(0)),
					]),
				);
			}
		}
	}
}

const styles = ["pastel", "watercolor"] as const;
const modes = ["light", "dark"] as const;
const phases = [0, 1] as const;
const identifier = (
	style: string,
	category: string,
	mode: string,
	phase: number,
): string => `${style}_${category}_${mode}_${phase}`;
const imports = styles.flatMap((style) =>
	materialCategories.flatMap((category) =>
		modes.flatMap((mode) =>
			phases.map(
				(phase) =>
					`import ${identifier(style, category, mode, phase)} from "../../assets/materials/${style}-${category}-${mode}-${phase}.png";`,
			),
		),
	),
);
const records = styles.map(
	(style) =>
		`${style}: {${materialCategories.map((category) => `${category}: {${modes.map((mode) => `${mode}: [${phases.map((phase) => identifier(style, category, mode, phase)).join(",")}]`).join(",")}}`).join(",")}}`,
);
const manifest = `${import.meta.dir}/../src/design-system/card-material-images.ts`;
await Bun.write(
	manifest,
	`${imports.join("\n")}\nexport const cardMaterialImages = {${records.join(",")}} as const;\n`,
);
const format = Bun.spawn(
	[process.execPath, "x", "biome", "check", "--write", manifest],
	{ stdout: "inherit", stderr: "inherit" },
);
if (await format.exited)
	throw new Error("Material manifest could not be formatted.");
