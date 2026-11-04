import { type ReactElement, useState } from "react";
import {
	ClubCardPreviewFrame,
	EmptyState,
	Grid,
	SegmentedControl,
	Stack,
	Text,
} from "../design-system";
import { ClubShell } from "./club-shell";
import { HomeFitness } from "./home-fitness";

const options = [
	{ value: "line", label: "A · Aligned line" },
	{ value: "dots", label: "B · Result dots" },
	{ value: "tall", label: "C · Taller trend" },
	{ value: "wide", label: "D · Full-width trend" },
] as const;
export const FitnessCardOptionsScreen = (): ReactElement => {
	const [viewport, setViewport] = useState<"phone" | "desktop">("phone");
	if (process.env.EXPO_PUBLIC_REVIEW_MODE !== "true")
		return <EmptyState title="Review unavailable" />;
	return (
		<ClubShell title="Fitness cards">
			<SegmentedControl
				label="Viewport"
				value={viewport}
				onValueChange={setViewport}
				options={[
					{ value: "phone", label: "Phone" },
					{ value: "desktop", label: "Desktop" },
				]}
			/>
			<Stack gap="lg">
				{[options.slice(0, 2), options.slice(2)].map((group) => (
					<Grid key={group.at(0)?.value} gap="lg">
						{group.map((option) => (
							<Stack key={option.value} gap="xs">
								<Text variant="h4">{option.label}</Text>
								<ClubCardPreviewFrame size={viewport}>
									<HomeFitness chart={option.value} />
								</ClubCardPreviewFrame>
							</Stack>
						))}
					</Grid>
				))}
			</Stack>
		</ClubShell>
	);
};
