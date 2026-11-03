import { expect, test } from "bun:test";
import {
	verificationDocuments,
	verificationZip,
} from "../scripts/verification-documents";
import {
	documentContainerMime,
	validateDocumentContainer,
} from "../src/domain/resource-documents";
import { resourceMediaMime } from "../src/domain/resources";

test("common Office, OpenDocument, CSV and UTF-8 text require matching names and document structure", (): void => {
	for (const file of verificationDocuments) {
		expect(
			resourceMediaMime(
				file.bytes.slice(0, 64),
				"document",
				file.mime,
				file.name,
			),
		).toBe(file.mime);
		expect(validateDocumentContainer(file.bytes, file.mime, file.name)).toBe(
			true,
		);
		expect(
			documentContainerMime(file.bytes, file.mime, "malicious.exe"),
		).toBeUndefined();
	}
});
test("document validation rejects HTML, executable bytes, invalid UTF-8, malformed archives and macros", (): void => {
	for (const content of [
		"<html><script>alert(1)</script></html>",
		"<!doctype html><html></html>",
		"<svg></svg>",
		"\u0000binary",
	]) {
		expect(
			documentContainerMime(
				new TextEncoder().encode(content),
				"text/plain",
				"note.txt",
			),
		).toBeUndefined();
	}
	expect(
		validateDocumentContainer(
			new Uint8Array([0xff, 0xff]),
			"text/plain",
			"note.txt",
		),
	).toBe(false);
	const docx = verificationDocuments.find((file) =>
		file.name.endsWith(".docx"),
	);
	if (!docx) throw new Error("Missing document fixture.");
	expect(
		validateDocumentContainer(docx.bytes.slice(0, -1), docx.mime, docx.name),
	).toBe(false);
	expect(
		validateDocumentContainer(
			verificationZip([{ name: "word/document.xml", text: "document" }]),
			docx.mime,
			docx.name,
		),
	).toBe(false);
	expect(
		validateDocumentContainer(
			verificationZip([
				{ name: "[Content_Types].xml", text: "types" },
				{ name: "word/document.xml", text: "document" },
				{ name: "word/vbaProject.bin", text: "macro" },
			]),
			docx.mime,
			docx.name,
		),
	).toBe(false);
	expect(
		validateDocumentContainer(
			verificationZip([
				{
					name: "mimetype",
					text: "application/vnd.oasis.opendocument.spreadsheet",
				},
				{ name: "content.xml", text: "content" },
			]),
			"application/vnd.oasis.opendocument.text",
			"doc.odt",
		),
	).toBe(false);
});
