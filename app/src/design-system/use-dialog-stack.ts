import {
	createContext,
	useCallback,
	useContext,
	useId,
	useLayoutEffect,
	useRef,
	useSyncExternalStore,
} from "react";
import {
	type DialogFrame,
	type DialogLayer,
	type DialogStackAction,
	type DialogStackEntry,
	dialogCanPresent,
	dialogLayer,
	dialogStack,
} from "./dialog-stack";

export const DialogStackParent = createContext<string | undefined>(undefined);

const empty: readonly DialogStackEntry[] = [];
const state: {
	entries: readonly DialogStackEntry[];
	listeners: Set<() => void>;
} = { entries: empty, listeners: new Set() };

const update = (action: DialogStackAction): void => {
	const entries = dialogStack(state.entries, action);
	if (entries === state.entries) return;
	state.entries = entries;
	for (const listener of state.listeners) listener();
};

const subscribe = (listener: () => void): (() => void) => {
	state.listeners.add(listener);
	return (): void => {
		state.listeners.delete(listener);
	};
};

const snapshot = (): readonly DialogStackEntry[] => state.entries;
const serverSnapshot = (): readonly DialogStackEntry[] => empty;

export const useDialogStack = (
	visible: boolean,
	isOpen: boolean,
): DialogLayer & {
	id: string;
	canPresent: boolean;
	onShow: () => void;
	onLayout: (frame: DialogFrame) => void;
} => {
	const id = useId();
	const parent = useContext(DialogStackParent);
	const current = useRef(isOpen);
	current.current = isOpen;
	const entries = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
	useLayoutEffect(() => {
		if (!visible) return;
		update({ type: "upsert", entry: { id, parent, isOpen: current.current } });
		return (): void => update({ type: "remove", id });
	}, [id, parent, visible]);
	useLayoutEffect(() => {
		if (visible) update({ type: "upsert", entry: { id, parent, isOpen } });
	}, [id, parent, visible, isOpen]);
	const onShow = useCallback((): void => update({ type: "shown", id }), [id]);
	const onLayout = useCallback(
		(frame: DialogFrame): void => update({ type: "layout", id, frame }),
		[id],
	);
	const entry = entries.find((candidate) => candidate.id === id);
	return {
		id,
		canPresent: dialogCanPresent(entries, { ...entry, id, parent, isOpen }),
		onShow,
		onLayout,
		...dialogLayer(entries, id),
	};
};
