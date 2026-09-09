import Papa from "papaparse";
import { type ImportKind, type ImportRow, importFields } from "./import-data";
export type CsvTable = { headers: string[]; rows: ImportRow[] };
export const parseImportCsv = (text: string): CsvTable => {
	if (new TextEncoder().encode(text).length > 2_000_000)
		throw new Error("Choose a CSV smaller than 2 MB.");
	const parsed = Papa.parse<ImportRow>(text, {
		header: true,
		skipEmptyLines: "greedy",
		transformHeader: (header) => header.trim(),
	});
	if (parsed.errors.length)
		throw new Error(`CSV: ${parsed.errors.at(0)?.message}`);
	const headers = parsed.meta.fields ?? [];
	if (!headers.length || !parsed.data.length)
		throw new Error("The CSV is empty.");
	if (parsed.data.length > 500)
		throw new Error("Import up to 500 rows at a time.");
	if (
		headers.length > 40 ||
		new Set(headers).size !== headers.length ||
		parsed.meta.renamedHeaders
	)
		throw new Error("Use unique column headers, up to 40 columns.");
	return { headers, rows: parsed.data };
};
export const mapImportColumns = (
	table: CsvTable,
	mapping: Record<string, string>,
): ImportRow[] =>
	table.rows.map((row) =>
		Object.fromEntries(
			Object.entries(mapping).map(([key, column]) => [key, row[column] ?? ""]),
		),
	);
export const importTemplate = (kind: ImportKind): string => {
	const examples: Record<ImportKind, string[]> = {
		members: ["player-1", "Taylor Example", ""],
		events: [
			"practice-1",
			"Club training",
			"2026-10-05",
			"19:00",
			"20:30",
			"Pool",
			"24",
			"training",
		],
		attendance: ["attendance-1", "player-1", "practice-1", "going", "present"],
		registration: ["registration-1", "player-1", "approved", "yes", "160.00"],
		payments: [
			"payment-1",
			"player-1",
			"160.00",
			"2026-10-01",
			"E-transfer reference",
		],
	};
	return Papa.unparse({
		fields: importFields[kind].map((field) => field.key),
		data: [examples[kind]],
	});
};
export const exportCsv = (rows: ImportRow[]): string =>
	Papa.unparse(rows, { escapeFormulae: true });
