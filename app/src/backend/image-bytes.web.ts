export const readImageBytes = (blob: Blob): Promise<ArrayBuffer> =>
	blob.arrayBuffer();
