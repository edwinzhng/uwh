import { type ReactElement, useState } from "react";
import { ClubCardPreviewFrame } from "./club-card-preview-frame";
import {
	type RoleTabTreatment,
	RoleTabTreatmentContext,
} from "./role-tab-treatment";
import { Stack } from "./stack";
import { Tabs } from "./tabs";
import { Text } from "./text";

type PreviewTab = "members" | "rankings" | "invites";
export const RoleTabPreview = ({
	title,
	treatment,
	viewport,
}: {
	title: string;
	treatment: RoleTabTreatment;
	viewport: "phone" | "desktop";
}): ReactElement => {
	const [tab, setTab] = useState<PreviewTab>("members");
	return (
		<Stack gap="sm">
			<Text variant="h4">{title}</Text>
			<ClubCardPreviewFrame size={viewport}>
				<RoleTabTreatmentContext value={treatment}>
					<Tabs<PreviewTab>
						label={title}
						value={tab}
						onValueChange={setTab}
						options={[
							{ value: "members", label: "Members" },
							{ value: "rankings", label: "Rankings", roleTone: "coach" },
							{ value: "invites", label: "Invites", roleTone: "admin" },
						]}
					/>
				</RoleTabTreatmentContext>
			</ClubCardPreviewFrame>
		</Stack>
	);
};
