import { resourceDocumentTypes } from "../src/domain/resource-documents";

const crc32 = (bytes: Uint8Array): number =>
	(bytes.reduce(
		(crc, value) =>
			Array.from({ length: 8 }).reduce<number>(
				(next) => (next >>> 1) ^ (next & 1 ? 0xedb88320 : 0),
				crc ^ value,
			),
		0xffffffff,
	) ^
		0xffffffff) >>>
	0;
export const verificationZip = (
	files: { name: string; text: string }[],
): Uint8Array => {
	const state = { offset: 0 };
	const entries = files.map((file) => {
		const name = new TextEncoder().encode(file.name);
		const contents = new TextEncoder().encode(file.text);
		const local = new Uint8Array(30 + name.length + contents.length);
		const header = new DataView(local.buffer);
		header.setUint32(0, 0x04034b50, true);
		header.setUint16(4, 20, true);
		header.setUint32(14, crc32(contents), true);
		header.setUint32(18, contents.length, true);
		header.setUint32(22, contents.length, true);
		header.setUint16(26, name.length, true);
		local.set(name, 30);
		local.set(contents, 30 + name.length);
		const central = new Uint8Array(46 + name.length);
		const directory = new DataView(central.buffer);
		directory.setUint32(0, 0x02014b50, true);
		directory.setUint16(4, 20, true);
		directory.setUint16(6, 20, true);
		directory.setUint32(16, crc32(contents), true);
		directory.setUint32(20, contents.length, true);
		directory.setUint32(24, contents.length, true);
		directory.setUint16(28, name.length, true);
		directory.setUint32(42, state.offset, true);
		central.set(name, 46);
		state.offset += local.length;
		return { local, central };
	});
	const centralSize = entries.reduce(
		(total, entry) => total + entry.central.length,
		0,
	);
	const result = new Uint8Array(state.offset + centralSize + 22);
	const cursor = { offset: 0 };
	for (const entry of entries) {
		result.set(entry.local, cursor.offset);
		cursor.offset += entry.local.length;
	}
	for (const entry of entries) {
		result.set(entry.central, cursor.offset);
		cursor.offset += entry.central.length;
	}
	const end = new DataView(result.buffer, cursor.offset, 22);
	end.setUint32(0, 0x06054b50, true);
	end.setUint16(8, entries.length, true);
	end.setUint16(10, entries.length, true);
	end.setUint32(12, centralSize, true);
	end.setUint32(16, state.offset, true);
	return result;
};
export const verificationDocuments = resourceDocumentTypes.map((type) => ({
	name: `fictional.${type.extension}`,
	mime: type.mime,
	bytes: !type.entry
		? new TextEncoder().encode(
				type.extension === "csv"
					? "player,position\nFictional,Forward\n"
					: "Fictional club document.\n",
			)
		: verificationZip([
				...(type.extension.startsWith("od")
					? [{ name: "mimetype", text: type.mime }]
					: [
							{
								name: "[Content_Types].xml",
								text: `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/${type.entry}" ContentType="${type.mime}"/></Types>`,
							},
						]),
				{
					name: type.entry,
					text: '<?xml version="1.0"?><document>Fictional verification content.</document>',
				},
			]),
}));
