export type NativeHaptic = "light" | "context-click";
export type HapticRequest = {
	platform: string;
	enabled: boolean;
	available: boolean;
};
export const nativeHaptic = ({
	platform,
	enabled,
	available,
}: HapticRequest): NativeHaptic | undefined =>
	!enabled || !available
		? undefined
		: platform === "ios"
			? "light"
			: platform === "android"
				? "context-click"
				: undefined;
export const performOptionalHaptic = async (
	input: HapticRequest,
	perform: (kind: NativeHaptic) => Promise<void>,
): Promise<void> => {
	const kind = nativeHaptic(input);
	if (!kind) return;
	try {
		await perform(kind);
	} catch {
		return;
	}
};
