import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { type ReactElement, useState } from "react";
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
		const file = new File(Paths.cache, filename);
		try {
			if (!(await Sharing.isAvailableAsync()))
				throw new Error("File sharing is unavailable on this device.");
			file.create({ overwrite: true });
			file.write(contents);
			await Sharing.shareAsync(file.uri, {
				mimeType,
				dialogTitle: "Export file",
			});
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
