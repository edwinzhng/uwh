"use client";

import { atom, useAtom } from "jotai";

export type Toast = {
	id: string;
	message: string;
	type: "success" | "error";
};

export const toastsAtom = atom<Toast[]>([]);

export function useToast() {
	const [, setToasts] = useAtom(toastsAtom);

	const toast = {
		success: (message: string) => {
			const id = crypto.randomUUID();
			setToasts((prev) => [...prev, { id, message, type: "success" }]);
			setTimeout(() => {
				setToasts((prev) => prev.filter((t) => t.id !== id));
			}, 4000);
		},
		error: (message: string) => {
			const id = crypto.randomUUID();
			setToasts((prev) => [...prev, { id, message, type: "error" }]);
			setTimeout(() => {
				setToasts((prev) => prev.filter((t) => t.id !== id));
			}, 5000);
		},
	};

	return toast;
}
