export const discardVoice = (uri: string): void => {
	if (uri.startsWith("blob:")) URL.revokeObjectURL(uri);
};
