import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { usePathname } from "expo-router";
import {
	createContext,
	type ReactElement,
	type ReactNode,
	useContext,
} from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

type Safety = {
	available: boolean;
	status?: FunctionReturnType<typeof api.moderation.status>;
	queue?: FunctionReturnType<typeof api.moderation.queue>;
	block?: (targetId: string, blocked: boolean) => Promise<void>;
	report?: (
		messageId: string,
		reason: string,
		blockAuthor: boolean,
	) => Promise<void>;
	review?: (
		reportId: Id<"chatReports">,
		decision: "dismissed" | "removed",
		pauseChat: boolean,
	) => Promise<void>;
	restore?: (userId: Id<"users">) => Promise<void>;
};
const SafetyContext = createContext<Safety>({ available: false });
export const useChatSafety = (): Safety => useContext(SafetyContext);
export const ChatSafetyProvider = ({
	active,
	admin,
	children,
}: {
	active: boolean;
	admin: boolean;
	children: ReactNode;
}): ReactElement => {
	const status = useQuery(api.moderation.status, active ? {} : "skip");
	const path = usePathname();
	const queue = useQuery(
		api.moderation.queue,
		active && admin && path === "/moderation"
			? { includeReports: false }
			: "skip",
	);
	const block = useMutation(api.moderation.block);
	const report = useMutation(api.moderation.report);
	const review = useMutation(api.moderation.review);
	const restore = useMutation(api.moderation.restore);
	return (
		<SafetyContext.Provider
			value={{
				available: active,
				status,
				queue,
				block: async (targetId, blocked): Promise<void> => {
					await block({ targetId, blocked });
				},
				report: async (messageId, reason, blockAuthor): Promise<void> => {
					await report({ messageId, reason, blockAuthor });
				},
				review: async (reportId, decision, pauseChat): Promise<void> => {
					await review({ reportId, decision, pauseChat });
				},
				restore: async (userId): Promise<void> => {
					await restore({ userId });
				},
			}}
		>
			{children}
		</SafetyContext.Provider>
	);
};
