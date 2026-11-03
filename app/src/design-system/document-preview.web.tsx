import type { ReactElement } from "react";
import { MediaImage } from "./media-image";
import { PdfDocument } from "./pdf-document.web";

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
		<PdfDocument uri={uri} label={label} />
	);
