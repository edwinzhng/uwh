import { useEffect, useState } from "react";
import { createMediaAsset, type MediaAsset } from "../design-system";
import { readImageBytes } from "./image-bytes";
import type { PickedResourceFile } from "./pick-resource-file";

export const usePickedResourceFile = (
	file?: PickedResourceFile,
): string | undefined => {
	const [loaded, setLoaded] = useState<{
		file: PickedResourceFile;
		asset: MediaAsset;
	}>();
	useEffect((): (() => void) | undefined => {
		if (!file) return undefined;
		const pending: { active: boolean; asset?: MediaAsset } = { active: true };
		void readImageBytes(file.blob)
			.then((bytes) => createMediaAsset(bytes, file.name, file.blob.type))
			.then(
				(asset): void => {
					if (!pending.active) {
						asset.dispose();
						return;
					}
					pending.asset = asset;
					setLoaded({ file, asset });
				},
				(): void => {},
			);
		return (): void => {
			pending.active = false;
			pending.asset?.dispose();
		};
	}, [file]);
	return loaded?.file === file ? loaded?.asset.uri : undefined;
};
