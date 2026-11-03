import { useRouter } from "expo-router";
import type { ReactElement } from "react";
import { Linking } from "react-native";
import { Button, Stack, Text } from "../design-system";
import { resourceUrl } from "../domain/resources";
import type { SessionPlanMedia as PlanMedia } from "../domain/session-plan";
import { useTask } from "./use-task";

export const SessionPlanMedia = ({
	media,
}: {
	media: PlanMedia;
}): ReactElement => {
	const router = useRouter();
	const task = useTask();
	return (
		<Stack gap="xxs">
			<Button
				label={media.label}
				prefix={media.source === "resource" ? "archive" : "image"}
				variant="ghost"
				isLoading={task.busy}
				onPress={(): void => {
					if (media.source === "resource")
						router.push({
							pathname: "/resources",
							params: { id: media.resourceId },
						});
					else
						void task.run(async (): Promise<void> => {
							const url = resourceUrl(media.url);
							if (!url) throw new Error("This media link is unavailable.");
							await Linking.openURL(url);
						});
				}}
			/>
			{task.error ? (
				<Text tone="danger" variant="small">
					{task.error}
				</Text>
			) : undefined}
		</Stack>
	);
};
