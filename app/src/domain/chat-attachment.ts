import { imageMime } from "./messaging";
import { resourceMediaMime } from "./resources";

export const chatAttachmentMime = (
	bytes: Uint8Array,
	declared: string,
	name: string,
	file: boolean,
): string | undefined => {
	const mime = file
		? resourceMediaMime(bytes, "document", declared, name)
		: imageMime(bytes);
	return mime === declared ? mime : undefined;
};
