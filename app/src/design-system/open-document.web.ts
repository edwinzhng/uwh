export const openDocument = async (
	contents: ArrayBuffer,
	name: string,
	mime: string,
): Promise<void> => {
	const url = URL.createObjectURL(new Blob([contents], { type: mime }));
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = name;
	document.body.append(anchor);
	anchor.click();
	anchor.remove();
	setTimeout((): void => URL.revokeObjectURL(url), 1000);
};
