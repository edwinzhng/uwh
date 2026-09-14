import { type ReactElement, useEffect, useRef, useState } from "react";
import { Button } from "./button";
import type { FileDownloadProps } from "./file-download-props";

export const FileDownload = ({
	label,
	filename,
	contents,
	mimeType = "text/calendar",
	onError,
}: FileDownloadProps): ReactElement => {
	const anchor = useRef<HTMLAnchorElement>(null);
	const [url, setUrl] = useState<string>();
	useEffect(() => {
		const uri = URL.createObjectURL(
			new Blob([contents], { type: `${mimeType};charset=utf-8` }),
		);
		setUrl(uri);
		return (): void => URL.revokeObjectURL(uri);
	}, [contents, mimeType]);
	return (
		<>
			<Button
				label={label}
				prefix="download"
				variant="secondary"
				isDisabled={!url}
				onPress={(): void => {
					if (anchor.current) anchor.current.click();
					else onError("Could not download calendar.");
				}}
			/>
			<a ref={anchor} href={url} download={filename} hidden tabIndex={-1}>
				Download calendar
			</a>
		</>
	);
};
