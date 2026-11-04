import { expect, test } from "bun:test";
import { createPreviewPlanImages } from "../src/backend/plan-images";

test("preview image uploads require current coaching authorization before reading file bytes", async (): Promise<void> => {
	const service = createPreviewPlanImages({
		actorId: (): string => "guardian",
		canUpload: (): boolean => false,
		canRead: (): boolean => false,
	});
	await expect(
		service.upload(new Blob(["not an image"]), "image.png"),
	).rejects.toThrow("Coach access required");
	await expect(service.read("guessed-file-id")).rejects.toThrow(
		"Image unavailable",
	);
});
