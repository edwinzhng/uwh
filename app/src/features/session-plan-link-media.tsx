import type { ReactElement } from "react";
import { DocumentPreview, ExternalVideo, Text } from "../design-system";
import { resourceUrl, supportedResourceLink } from "../domain/resources";
import { inlinePdfAvailable } from "../platform/inline-document";

export const SessionPlanLinkMedia = ({
	url,
	label,
}: {
	url: string;
	label: string;
}): ReactElement => {
	const secure = resourceUrl(url);
	if (!secure)
		return (
			<Text variant="small" tone="secondary">
				Media unavailable.
			</Text>
		);
	if (supportedResourceLink("video", secure))
		return <ExternalVideo url={secure} label={label} />;
	if (!supportedResourceLink("document", secure))
		return (
			<Text variant="small" tone="secondary">
				This attachment does not support an inline preview.
			</Text>
		);
	const image = /\.(?:png|jpe?g|webp|gif)$/i.test(new URL(secure).pathname);
	return image || inlinePdfAvailable ? (
		<DocumentPreview uri={secure} label={label} image={image} />
	) : (
		<Text variant="small" tone="secondary">
			PDF preview is unavailable on this device.
		</Text>
	);
};
