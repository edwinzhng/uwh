import { randomUUID } from "expo-crypto";
import { useRef } from "react";

export const useOperationKey = (): ((payload: string) => string) => {
	const operation = useRef<{ payload: string; key: string }>(undefined);
	return (payload: string): string => {
		if (operation.current?.payload === payload) return operation.current.key;
		const key = randomUUID();
		operation.current = { payload, key };
		return key;
	};
};
