import type { ReactElement } from "react";
import { Linking } from "react-native";
import { Button, Row, Stack, Text } from "../design-system";
import { useTask } from "./use-task";

const informationLinks = [
	{ label: "Privacy Policy", url: "https://app.calgaryuwh.com/privacy" },
	{ label: "Terms of Use", url: "https://app.calgaryuwh.com/terms" },
	{ label: "Support", url: "https://app.calgaryuwh.com/support" },
];

export const AppInformationLinks = (): ReactElement => {
	const task = useTask();
	return (
		<Stack gap="xs">
			<Row wrap gap="xs">
				{informationLinks.map((link) => (
					<Button
						key={link.url}
						label={link.label}
						variant="ghost"
						isDisabled={task.busy}
						onPress={(): void => {
							void task.run(async (): Promise<void> => {
								await Linking.openURL(link.url);
							});
						}}
					/>
				))}
			</Row>
			{task.error ? (
				<Text variant="small" tone="danger">
					{task.error}
				</Text>
			) : undefined}
		</Stack>
	);
};
