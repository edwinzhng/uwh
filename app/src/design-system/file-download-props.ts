export type FileDownloadProps = {
	label: string;
	filename: string;
	contents: string;
	mimeType?: "text/calendar" | "text/csv";
	onError: (message: string) => void;
};
