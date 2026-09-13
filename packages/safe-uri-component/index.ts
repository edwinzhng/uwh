module.exports = (encodedURI: string): string => {
	if (typeof encodedURI !== "string")
		throw new TypeError("Expected a string URI component.");
	const normalized = encodedURI.replace(/\+/g, " ");
	try {
		return decodeURIComponent(normalized);
	} catch {
		return normalized;
	}
};
