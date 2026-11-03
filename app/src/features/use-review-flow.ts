import { useGlobalSearchParams } from "expo-router";
import { useApp } from "../demo/app-state";

export const useReviewFlow = (): string | undefined => {
	const { reviewFlow } = useGlobalSearchParams<{ reviewFlow?: string }>();
	const { source } = useApp();
	return process.env.EXPO_PUBLIC_REVIEW_MODE === "true" && source === "preview"
		? reviewFlow
		: undefined;
};
