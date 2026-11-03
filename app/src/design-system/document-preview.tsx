import type { ReactElement } from "react";
import { MediaImage } from "./media-image";
import { Text } from "./text";

export const DocumentPreview = ({
	uri,
	label,
	image,
}: {
	uri: string;
	label: string;
	image: boolean;
}): ReactElement =>
	image ? (
		<MediaImage uri={uri} label={label} />
	) : (
		<Text tone="secondary">Open this document to view it on your device.</Text>
	);
