export const readImageBytes = (blob: Blob): Promise<ArrayBuffer> =>
	new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = (): void =>
			reader.result instanceof ArrayBuffer
				? resolve(reader.result)
				: reject(new Error("Could not read photo."));
		reader.onerror = (): void => reject(new Error("Could not read photo."));
		reader.readAsArrayBuffer(blob);
	});
