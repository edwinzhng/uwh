import type { ReactElement } from "react";
import { AppLayout } from "./app-layout";
import { ControlStylePreview } from "./control-style-preview";
import { EmptyState } from "./empty-state";
import { Grid } from "./grid";
import { Stack } from "./stack";
import type { TabAppearance } from "./tab-appearance";
import { Text } from "./text";

const choices: readonly { appearance: TabAppearance; title: string }[] = [
	{ appearance: "current", title: "A · Current" },
	{ appearance: "inset", title: "B · Compact inset" },
	{ appearance: "outline", title: "C · Outline" },
	{ appearance: "underline", title: "D · Underline" },
];
export const ControlOptionsScreen = (): ReactElement => {
	if (process.env.EXPO_PUBLIC_REVIEW_MODE !== "true")
		return <EmptyState title="Review unavailable" />;
	return (
		<AppLayout title="Segmented controls">
			<Stack gap="xl">
				{(["phone", "desktop"] satisfies ("phone" | "desktop")[]).map(
					(viewport) => (
						<Stack key={viewport} gap="lg">
							<Text variant="h3">
								{viewport === "phone" ? "Phone" : "Desktop"}
							</Text>
							{[choices.slice(0, 2), choices.slice(2)].map((pair) => (
								<Grid key={pair.at(0)?.appearance} gap="lg">
									{pair.map((choice) => (
										<ControlStylePreview
											key={choice.appearance}
											{...choice}
											viewport={viewport}
										/>
									))}
								</Grid>
							))}
						</Stack>
					),
				)}
			</Stack>
		</AppLayout>
	);
};
