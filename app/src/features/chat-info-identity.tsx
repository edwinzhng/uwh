import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import {
	Avatar,
	CenteredHeading,
	EditableAvatar,
	IconButton,
	Row,
	Stack,
	Text,
} from "../design-system";
import type { Conversation } from "../domain/app-types";
import {
	canEditChatAppearance,
	canRenameChat,
} from "../domain/chat-appearance";
import { conversationKindLabel } from "../domain/messaging";
import { useImageService } from "./use-image-service";
import { usePhotoUri } from "./use-photo-uri";

export const ChatInfoIdentity = ({
	thread,
	pictureDisabled,
	onPicture,
	onName,
}: {
	thread: Conversation;
	pictureDisabled?: boolean;
	onPicture: () => void;
	onName: () => void;
}): ReactElement => {
	const { account } = useApp();
	const photo = usePhotoUri(thread.avatarImageId, useImageService());
	return (
		<Stack gap="sm">
			<Row justify="center">
				{canEditChatAppearance(thread, account) ? (
					<EditableAvatar
						name={thread.title}
						uri={photo.uri}
						initials
						label="Edit chat picture"
						isDisabled={pictureDisabled}
						hoverOverlay
						onPress={onPicture}
					/>
				) : (
					<Avatar name={thread.title} uri={photo.uri} initials large />
				)}
			</Row>
			<Stack gap="xxs">
				<CenteredHeading
					action={
						canRenameChat(thread, account) ? (
							<IconButton label="Edit chat name" icon="edit" onPress={onName} />
						) : undefined
					}
				>
					{thread.title}
				</CenteredHeading>
				<Text variant="small" tone="secondary" align="center">
					{conversationKindLabel(thread)}
				</Text>
			</Stack>
		</Stack>
	);
};
