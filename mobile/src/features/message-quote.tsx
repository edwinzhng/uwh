import type { ReactElement } from "react";
import { Stack, Surface, Text } from "../design-system";
import type { Message } from "../domain/app-types";
import { messagePreview } from "../domain/messaging";

export const MessageQuote = ({
	message,
}: {
	message?: Message;
}): ReactElement => (
	<Surface variant="subtle" density="compact">
		<Stack gap="xxs">
			{message && !message.deleted ? (
				<Text variant="caption">{message.author}</Text>
			) : undefined}
			<Text variant="caption" tone="secondary">
				{message
					? messagePreview(message).slice(0, 160)
					: "Message unavailable"}
			</Text>
		</Stack>
	</Surface>
);
