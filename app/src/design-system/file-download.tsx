import { type ReactElement, useState } from "react";
import { requireNativeFeature } from "../platform/native-feature";
import { Button } from "./button";
import type { FileDownloadProps } from "./file-download-props";

export const FileDownload = ({
	label,
	filename,
	contents,
	mimeType = "text/calendar",
	onError,
}: FileDownloadProps): ReactElement => {
	const [busy, setBusy] = useState(false);
	const save = async (): Promise<void> => {
		if (busy) return;
		setBusy(true);
		try {
			requireNativeFeature("FileSystem", "file downloads");
			requireNativeFeature("ExpoSharing", "file downloads");
			const [{ File, Paths }, Sharing] = await Promise.all([
				import("expo-file-system"),
				import("expo-sharing"),
			]);
			if (!(await Sharing.isAvailableAsync()))
				throw new Error("File sharing is unavailable on this device.");
			const file = new File(Paths.cache, filename);
			file.create({ overwrite: true });
			try {
				file.write(contents);
				await Sharing.shareAsync(file.uri, {
					mimeType,
					dialogTitle: "Export file",
				});
			} finally {
				if (file.exists) file.delete();
			}
		} catch (error) {
			onError(
				error instanceof Error ? error.message : "Could not export calendar.",
			);
		} finally {
			setBusy(false);
		}
	};
	return (
		<Button
			label={label}
			prefix="download"
			variant="secondary"
			isLoading={busy}
			onPress={(): void => {
				void save();
			}}
		/>
	);
};
