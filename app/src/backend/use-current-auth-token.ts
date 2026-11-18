import { useAuthToken } from "@convex-dev/auth/react";
import { useCallback, useRef } from "react";

export const useCurrentAuthToken = (): {
	available: boolean;
	current: () => string | undefined;
} => {
	const token = useAuthToken() ?? undefined;
	const latest = useRef(token);
	latest.current = token;
	const current = useCallback((): string | undefined => latest.current, []);
	return { available: Boolean(token), current };
};
