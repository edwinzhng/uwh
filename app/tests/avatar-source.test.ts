import { expect, test } from "bun:test";
import { avatarPhotoId } from "../src/design-system/avatar-source";

test("avatars prefer stable identity and never borrow a same-name member’s photo", (): void => {
	const photos = [
		{ personId: "one", name: "Alex Rivera", photoId: "photo-one" },
		{ personId: "two", name: "Alex Rivera" },
		{ personId: "three", name: "Sam Rivera", photoId: "photo-three" },
	];
	expect(avatarPhotoId(photos, "Alex Rivera")).toBeUndefined();
	expect(avatarPhotoId(photos, "Alex Rivera", "two")).toBeUndefined();
	expect(avatarPhotoId(photos, "Old name", "one")).toBe("photo-one");
	expect(avatarPhotoId(photos, " SAM RIVERA ")).toBe("photo-three");
	expect(avatarPhotoId(photos, "Sam Rivera", "missing")).toBeUndefined();
});
