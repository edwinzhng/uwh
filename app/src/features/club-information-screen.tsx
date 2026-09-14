import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import {
	List,
	ListItem,
	SectionHeading,
	Stack,
	Surface,
	Text,
} from "../design-system";
import { programs } from "../domain/app-rules";
import { ClubShell } from "./club-shell";

export const ClubInformationScreen = (): ReactElement => {
	const { data } = useApp();
	return (
		<ClubShell title="Club information" subtitle={data.clubName}>
			<Stack gap="sm">
				<SectionHeading size="small">Programs</SectionHeading>
				<Surface padding="xs">
					<List>
						{programs.map((program) => (
							<ListItem
								key={program.value}
								title={program.label}
								icon="users"
							/>
						))}
					</List>
				</Surface>
			</Stack>
			<Stack gap="sm">
				<SectionHeading size="small">Pools & venues</SectionHeading>
				<Surface padding="xs">
					<List>
						{data.venues?.length ? (
							data.venues.map((venue) => (
								<ListItem key={venue} title={venue} icon="waves" />
							))
						) : (
							<Text variant="small">See each session for its venue.</Text>
						)}
					</List>
				</Surface>
			</Stack>
			<Text variant="small" tone="secondary">
				Club timezone: {data.timeZone}
			</Text>
		</ClubShell>
	);
};
