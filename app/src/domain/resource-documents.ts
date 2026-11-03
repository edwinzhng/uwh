export const resourceDocumentTypes = [
	{
		extension: "docx",
		mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		entry: "word/document.xml",
	},
	{
		extension: "xlsx",
		mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		entry: "xl/workbook.xml",
	},
	{
		extension: "pptx",
		mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
		entry: "ppt/presentation.xml",
	},
	{
		extension: "odt",
		mime: "application/vnd.oasis.opendocument.text",
		entry: "content.xml",
	},
	{
		extension: "ods",
		mime: "application/vnd.oasis.opendocument.spreadsheet",
		entry: "content.xml",
	},
	{
		extension: "odp",
		mime: "application/vnd.oasis.opendocument.presentation",
		entry: "content.xml",
	},
	{ extension: "txt", mime: "text/plain", entry: undefined },
	{ extension: "csv", mime: "text/csv", entry: undefined },
] as const;
export const resourceDocumentMimes: string[] = resourceDocumentTypes.map(
	(type) => type.mime,
);
const textPrefix = (bytes: Uint8Array): boolean => {
	const text = new TextDecoder()
		.decode(bytes)
		.replace(/^\uFEFF/, "")
		.trimStart();
	return (
		!bytes.some((value) => value < 32 && ![9, 10, 13].includes(value)) &&
		!/^<(?:!doctype|html|head|body|script|svg|\?xml)\b/i.test(text)
	);
};
export const documentContainerMime = (
	bytes: Uint8Array,
	declared: string,
	name = "",
): string | undefined => {
	const mime = declared.split(";").at(0)?.trim().toLowerCase();
	const type = resourceDocumentTypes.find((type) => type.mime === mime);
	if (
		!type ||
		(name && name.split(".").at(-1)?.toLowerCase() !== type.extension)
	)
		return undefined;
	if (!type.entry) return textPrefix(bytes) ? type.mime : undefined;
	return bytes.at(0) === 0x50 &&
		bytes.at(1) === 0x4b &&
		bytes.at(2) === 3 &&
		bytes.at(3) === 4
		? type.mime
		: undefined;
};
type ZipEntry = {
	name: string;
	offset: number;
	compressed: number;
	size: number;
	method: number;
};
const zipEntries = (bytes: Uint8Array): ZipEntry[] | undefined => {
	if (bytes.length < 22) return undefined;
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const end = Array.from(
		{ length: Math.min(bytes.length - 21, 65536) },
		(_, index) => bytes.length - 22 - index,
	).find(
		(offset) =>
			view.getUint32(offset, true) === 0x06054b50 &&
			offset + 22 + view.getUint16(offset + 20, true) === bytes.length,
	);
	if (
		end === undefined ||
		view.getUint16(end + 4, true) !== 0 ||
		view.getUint16(end + 6, true) !== 0
	)
		return undefined;
	const count = view.getUint16(end + 10, true);
	const start = view.getUint32(end + 16, true);
	if (
		!count ||
		count > 1000 ||
		view.getUint16(end + 8, true) !== count ||
		start + view.getUint32(end + 12, true) !== end
	)
		return undefined;
	const state = { offset: start, total: 0 };
	const entries: ZipEntry[] = [];
	for (const _ of Array.from({ length: count })) {
		const offset = state.offset;
		if (
			offset + 46 > end ||
			view.getUint32(offset, true) !== 0x02014b50 ||
			view.getUint16(offset + 8, true) & 1
		)
			return undefined;
		const length = view.getUint16(offset + 28, true);
		const next =
			offset +
			46 +
			length +
			view.getUint16(offset + 30, true) +
			view.getUint16(offset + 32, true);
		if (next > end) return undefined;
		const name = new TextDecoder().decode(
			bytes.subarray(offset + 46, offset + 46 + length),
		);
		const method = view.getUint16(offset + 10, true);
		const compressed = view.getUint32(offset + 20, true);
		const size = view.getUint32(offset + 24, true);
		const local = view.getUint32(offset + 42, true);
		if (
			!name ||
			name.startsWith("/") ||
			name.includes("\\") ||
			name.split("/").includes("..") ||
			/(?:vbaProject\.bin|\.(?:exe|dll|js|html?|svg|xlsm|docm|pptm))$/i.test(
				name,
			) ||
			![0, 8].includes(method) ||
			local + 30 > start ||
			view.getUint32(local, true) !== 0x04034b50
		)
			return undefined;
		const data =
			local +
			30 +
			view.getUint16(local + 26, true) +
			view.getUint16(local + 28, true);
		state.total += size;
		if (
			data + compressed > start ||
			state.total > 50 * 1024 * 1024 ||
			view.getUint16(local + 8, true) !== method ||
			new TextDecoder().decode(
				bytes.subarray(
					local + 30,
					local + 30 + view.getUint16(local + 26, true),
				),
			) !== name
		)
			return undefined;
		entries.push({ name, offset: data, compressed, size, method });
		state.offset = next;
	}
	return state.offset === end &&
		new Set(entries.map((entry) => entry.name)).size === count
		? entries
		: undefined;
};
export const validateDocumentContainer = (
	bytes: Uint8Array,
	mime: string,
	name: string,
): boolean => {
	const type = resourceDocumentTypes.find((type) => type.mime === mime);
	if (!type || !documentContainerMime(bytes, mime, name)) return false;
	if (!type.entry) {
		const text = new TextDecoder("utf-8", { fatal: true });
		try {
			text.decode(bytes);
			return textPrefix(bytes);
		} catch {
			return false;
		}
	}
	const entries = zipEntries(bytes);
	if (!entries?.some((entry) => entry.name === type.entry)) return false;
	if (type.extension.startsWith("od")) {
		const entry = entries.find((entry) => entry.name === "mimetype");
		return Boolean(
			entry &&
				entry.method === 0 &&
				entry.size === entry.compressed &&
				new TextDecoder().decode(
					bytes.subarray(entry.offset, entry.offset + entry.size),
				) === mime,
		);
	}
	return entries.some((entry) => entry.name === "[Content_Types].xml");
};
