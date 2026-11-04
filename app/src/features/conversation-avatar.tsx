import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import { Avatar, AvatarStack } from "../design-system";
import {
	type ConversationSummary,
	conversationKind,
} from "../domain/messaging";
import { useImageService } from "./use-image-service";
import { usePhotoUri } from "./use-photo-uri";

export const ConversationAvatar = ({
	thread,
}: {
	thread: ConversationSummary;
}): ReactElement => {
	const { data, accounts, account } = useApp();
	const kind = conversationKind(thread);
	const photo = usePhotoUri(thread.avatarImageId, useImageService());
	const people =
		thread.participants ??
		[
			...new Set([
				...(thread.participantPersonIds ?? []),
				...accounts
					.filter(
						(entry) =>
							entry.id !== account.id && thread.accountIds.includes(entry.id),
					)
					.map((entry) => entry.personId),
			]),
		]
			.filter((id) => id !== account.personId)
			.slice(0, 3)
			.flatMap((personId) => {
				const person = data.members.find((entry) => entry.id === personId);
				return person ? [{ personId, name: person.name }] : [];
			});
	const visible =
		kind === "direct"
			? people.length
				? people.slice(0, 1)
				: [{ name: thread.title }]
			: people;
	if (kind !== "direct")
		return <Avatar compact name={thread.title} uri={photo.uri} initials />;
	return (
		<AvatarStack name={thread.title} people={visible} imageUri={photo.uri} />
	);
};
