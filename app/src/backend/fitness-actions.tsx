import { useMutation } from "convex/react";
import { useAtomValue, useSetAtom } from "jotai";
import {
	createContext,
	type ReactElement,
	type ReactNode,
	useContext,
} from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { newId, useApp } from "../demo/app-state";
import {
	previewFitnessActionAtom,
	previewFitnessAtom,
} from "../demo/fitness-state";
import { logFitnessResult } from "../domain/fitness-log";
import type {
	FitnessLogInput,
	FitnessResultInput,
	FitnessSessionInput,
	FitnessTestInput,
} from "../domain/fitness-model";

type FitnessActions = {
	logResult: (input: FitnessLogInput) => Promise<void>;
	saveTest: (input: FitnessTestInput) => Promise<string>;
	archiveTest: (input: {
		testId: string;
		revision: number;
		archived: boolean;
	}) => Promise<void>;
	saveSession: (input: FitnessSessionInput) => Promise<string>;
	deleteSession: (input: {
		sessionId: string;
		revision: number;
	}) => Promise<void>;
	saveResults: (input: FitnessResultInput) => Promise<number>;
};
const Context = createContext<FitnessActions | undefined>(undefined);
export const useFitnessActions = (): FitnessActions => {
	const actions = useContext(Context);
	if (!actions) throw new Error("Fitness actions require a fitness provider.");
	return actions;
};
const LiveFitnessProvider = ({
	children,
}: {
	children: ReactNode;
}): ReactElement => {
	const saveTest = useMutation(api.fitness.saveTest);
	const archiveTest = useMutation(api.fitness.archiveTest);
	const saveSession = useMutation(api.fitness.saveSession);
	const deleteSession = useMutation(api.fitness.deleteSession);
	const saveResults = useMutation(api.fitness.saveResults);
	const logResult = useMutation(api.fitness.logResult);
	const actions: FitnessActions = {
		logResult: async (input): Promise<void> => {
			await logResult({ ...input, testId: input.testId as Id<"fitnessTests"> });
		},
		saveTest: async (input): Promise<string> =>
			saveTest({
				...input,
				testId: input.testId as Id<"fitnessTests"> | undefined,
			}),
		archiveTest: async (input): Promise<void> => {
			await archiveTest({
				...input,
				testId: input.testId as Id<"fitnessTests">,
			});
		},
		saveSession: async (input): Promise<string> =>
			saveSession({
				...input,
				testId: input.testId as Id<"fitnessTests">,
				sessionId: input.sessionId as Id<"fitnessSessions"> | undefined,
			}),
		deleteSession: async (input): Promise<void> => {
			await deleteSession({
				...input,
				sessionId: input.sessionId as Id<"fitnessSessions">,
			});
		},
		saveResults: async (input): Promise<number> =>
			saveResults({
				...input,
				sessionId: input.sessionId as Id<"fitnessSessions">,
			}),
	};
	return <Context.Provider value={actions}>{children}</Context.Provider>;
};
const PreviewFitnessProvider = ({
	children,
}: {
	children: ReactNode;
}): ReactElement => {
	const apply = useSetAtom(previewFitnessActionAtom);
	const state = useAtomValue(previewFitnessAtom);
	const setState = useSetAtom(previewFitnessAtom);
	const { account, data } = useApp();
	const actions: FitnessActions = {
		logResult: async (input): Promise<void> => {
			setState((current) =>
				logFitnessResult(current, account, data, input, newId()),
			);
		},
		saveTest: async (input): Promise<string> => {
			const id = input.testId ?? newId();
			apply({ type: "save-test", id, input });
			return id;
		},
		archiveTest: async (input): Promise<void> => {
			apply({ type: "archive-test", ...input });
		},
		saveSession: async (input): Promise<string> => {
			const id = input.sessionId ?? newId();
			apply({ type: "save-session", id, input });
			return id;
		},
		deleteSession: async (input): Promise<void> => {
			apply({ type: "delete-session", ...input });
		},
		saveResults: async (input): Promise<number> => {
			apply({ type: "save-results", input });
			return (
				(state.sessions.find((entry) => entry._id === input.sessionId)
					?.revision ?? 0) + 1
			);
		},
	};
	return <Context.Provider value={actions}>{children}</Context.Provider>;
};
export const FitnessProvider = ({
	children,
}: {
	children: ReactNode;
}): ReactElement =>
	useApp().source === "convex" ? (
		<LiveFitnessProvider>{children}</LiveFitnessProvider>
	) : (
		<PreviewFitnessProvider>{children}</PreviewFitnessProvider>
	);
