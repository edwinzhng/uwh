import { type ReactElement, useState } from "react";
import { ClubCardPreviewFrame } from "./club-card-preview-frame";
import { Stack } from "./stack";
import { Surface } from "./surface";
import { type TabAppearance, TabAppearanceContext } from "./tab-appearance";
import { Tabs } from "./tabs";
import { Text } from "./text";

export const ControlStylePreview = ({
	appearance,
	title,
	viewport,
}: {
	appearance: TabAppearance;
	title: string;
	viewport: "phone" | "desktop";
}): ReactElement => {
	const [editor, setEditor] = useState("details");
	const [filter, setFilter] = useState("all");
	const [status, setStatus] = useState("active");
	return (
		<Stack gap="sm">
			<Text variant="h4">{title}</Text>
			<ClubCardPreviewFrame size={viewport}>
				<Surface>
					<TabAppearanceContext value={appearance}>
						<Stack gap="lg">
							<Tabs
								label={`${title} editor`}
								value={editor}
								onValueChange={setEditor}
								options={[
									{ value: "details", label: "Details" },
									{ value: "roster", label: "Roster" },
									{ value: "rsvp", label: "RSVP" },
								]}
							/>
							<Tabs
								label={`${title} chats`}
								value={filter}
								onValueChange={setFilter}
								options={[
									{ value: "all", label: "All" },
									{ value: "unread", label: "Unread" },
									{ value: "groups", label: "Groups" },
									{ value: "programs", label: "Programs" },
								]}
							/>
							<Tabs
								label={`${title} programs`}
								value={status}
								onValueChange={setStatus}
								options={[
									{ value: "active", label: "Active" },
									{ value: "archived", label: "Archived" },
								]}
							/>
						</Stack>
					</TabAppearanceContext>
				</Surface>
			</ClubCardPreviewFrame>
		</Stack>
	);
};
