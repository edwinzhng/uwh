import { useAuthToken } from "@convex-dev/auth/react";
import { type ReactElement, useEffect, useMemo, useState } from "react";
import { readImageBytes } from "../backend/image-bytes";
import { createPlanImages, type PlanImages } from "../backend/plan-images";
import { usePreviewPlanImages } from "../backend/use-preview-plan-images";
import { useApp } from "../demo/app-state";
import {
	createMediaAsset,
	type MediaAsset,
	MediaImage,
	Text,
} from "../design-system";
import type { SessionPlanImage as PlanImage } from "../domain/session-plan";

const ImageContent = ({
	image,
	service,
}: {
	image: PlanImage;
	service: PlanImages;
}): ReactElement => {
	const [loaded, setLoaded] = useState<{
		id: string;
		asset?: MediaAsset;
		failed?: boolean;
	}>();
	const { account } = useApp();
	const key = `${account.id}:${image.fileId}`;
	useEffect(() => {
		const pending: { active: boolean; asset?: MediaAsset } = { active: true };
		void service
			.read(image.fileId)
			.then(async (blob) =>
				createMediaAsset(await readImageBytes(blob), image.label, blob.type),
			)
			.then(
				(asset) => {
					if (!pending.active) {
						asset.dispose();
						return;
					}
					pending.asset = asset;
					setLoaded({ id: key, asset });
				},
				() => {
					if (pending.active) setLoaded({ id: key, failed: true });
				},
			);
		return (): void => {
			pending.active = false;
			pending.asset?.dispose();
		};
	}, [image.fileId, image.label, key, service.read]);
	return loaded?.id === key && loaded.asset ? (
		<MediaImage uri={loaded.asset.uri} label={image.label} naturalSize />
	) : (
		<Text tone="secondary">
			{loaded?.id === key && loaded.failed
				? "Image unavailable."
				: "Loading image…"}
		</Text>
	);
};
const LiveImage = ({ image }: { image: PlanImage }): ReactElement => {
	const token = useAuthToken();
	const service = useMemo(() => createPlanImages(token ?? undefined), [token]);
	return <ImageContent image={image} service={service} />;
};
const PreviewImage = ({ image }: { image: PlanImage }): ReactElement => (
	<ImageContent image={image} service={usePreviewPlanImages()} />
);
export const SessionPlanImage = ({
	image,
}: {
	image: PlanImage;
}): ReactElement =>
	useApp().source === "convex" ? (
		<LiveImage image={image} />
	) : (
		<PreviewImage image={image} />
	);
