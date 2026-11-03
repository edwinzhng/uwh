// packages/safe-uri-component/index.ts
module.exports = (encodedURI) => {
  if (typeof encodedURI !== "string")
    throw new TypeError("Expected a string URI component.");
  const normalized = encodedURI.replace(/\+/g, " ");
  try {
    return decodeURIComponent(normalized);
  } catch {
    return normalized;
  }
};
