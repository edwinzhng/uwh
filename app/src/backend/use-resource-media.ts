import { useEffect, useEffectEvent, useState } from "react";
import { useApp } from "../demo/app-state";
import { createMediaAsset, type MediaAsset } from "../design-system";
import {
	type Resource,
	type ResourceFileSlot,
	resourceSlotFileId,
} from "../domain/resources";
import { friendlyError } from "./errors";
import { readImageBytes } from "./image-bytes";
import type { ResourceState } from "./use-resources";

export const useResourceMedia = (
	state: ResourceState,
	resource: Resource,
	slot: ResourceFileSlot,
	enabled = true,
): { uri?: string; error?: string; loading: boolean; retry: () => void } => {
	const { account } = useApp();
	const [attempt, setAttempt] = useState(0);
	const [loaded, setLoaded] = useState<{
		key: string;
		asset?: MediaAsset;
		error?: string;
	}>();
	const fileId = resourceSlotFileId(resource, slot);
	const key = `${account.id}:${resource.id}:${resource.revision}:${slot}:${fileId}:${attempt}`;
	const read = useEffectEvent(async (): Promise<MediaAsset> => {
		const file = await state.read(resource, slot);
		return createMediaAsset(
			await readImageBytes(file.blob),
			file.name,
			file.mime,
		);
	});
	useEffect((): (() => void) | undefined => {
		if (!enabled || !fileId) return undefined;
		const pending: { active: boolean; asset?: MediaAsset } = { active: true };
		void read().then(
			(asset): void => {
				if (!pending.active) {
					asset.dispose();
					return;
				}
				pending.asset = asset;
				setLoaded({ key, asset });
			},
			(error): void => {
				if (pending.active) setLoaded({ key, error: friendlyError(error) });
			},
		);
		return (): void => {
			pending.active = false;
			pending.asset?.dispose();
		};
	}, [enabled, fileId, key]);
	return {
		uri: loaded?.key === key ? loaded.asset?.uri : undefined,
		error: loaded?.key === key ? loaded.error : undefined,
		loading: Boolean(enabled && fileId && loaded?.key !== key),
		retry: (): void => setAttempt((value) => value + 1),
	};
};
