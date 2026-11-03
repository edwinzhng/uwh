import type { ReactElement } from "react";
import { readImageBytes } from "../backend/image-bytes";
import { Button, openDocument, Stack, Text } from "../design-system";
import type { MessageImage } from "../domain/messaging";
import { useImageService } from "./use-image-service";
import { useTask } from "./use-task";

export const MessageFile = ({
	image,
	onRemove,
	disabled,
}: {
	image: MessageImage;
	onRemove?: () => void;
	disabled?: boolean;
}): ReactElement => {
	const service = useImageService();
	const task = useTask();
	return (
		<Stack gap="xxs">
			<Button
				label={image.name}
				prefix="download"
				variant="secondary"
				isDisabled={!service || disabled}
				isLoading={task.busy}
				onPress={(): void => {
					void task.run(async (): Promise<void> => {
						if (!service) return;
						const blob = await service.load(image.id);
						await openDocument(
							await readImageBytes(blob),
							image.name,
							blob.type,
						);
					});
				}}
			/>
			{task.error ? (
				<Text variant="caption" tone="danger">
					{task.error}
				</Text>
			) : undefined}
			{onRemove ? (
				<Button
					label="Remove file"
					variant="ghost"
					isDisabled={disabled || task.busy}
					onPress={onRemove}
				/>
			) : undefined}
		</Stack>
	);
};
