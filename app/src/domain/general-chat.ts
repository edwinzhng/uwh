import type { AppData, Conversation } from "./app-types";

export const generalConversation = (
	accountIds: string[],
	existing?: Conversation,
): Conversation => ({
	...existing,
	id: "club",
	title: "General",
	subtitle: "All club members",
	accountIds: [...new Set(accountIds)],
});
export const withGeneralChat = (
	data: AppData,
	accountIds: string[],
): AppData => {
	const existing = data.conversations.find((thread) => thread.id === "club");
	const general = generalConversation(accountIds, existing);
	return {
		...data,
		conversations: existing
			? data.conversations.map((thread) =>
					thread.id === "club" ? general : thread,
				)
			: [general, ...data.conversations],
	};
};
