import { ConvexError } from "convex/values";

export const shouldRestartPagination = (
	result: unknown,
	cursor: string | null,
): boolean =>
	cursor !== null &&
	result instanceof Error &&
	(result.message.includes("InvalidCursor") ||
		(result instanceof ConvexError &&
			typeof result.data === "object" &&
			result.data?.isConvexSystemError === true &&
			result.data?.paginationError === "InvalidCursor"));
