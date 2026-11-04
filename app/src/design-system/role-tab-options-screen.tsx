import { useAtom } from "jotai";
import { type ReactElement, useState } from "react";
import { AppLayout } from "./app-layout";
import { EmptyState } from "./empty-state";
import { Grid } from "./grid";
import { RoleStyleLabel } from "./role-style-label";
import { RoleTabPreview } from "./role-tab-preview";
import { Row } from "./row";
import { SegmentedControl } from "./segmented-control";
import { Stack } from "./stack";
import { themePreferenceAtom } from "./theme";
import { ThemeToggle } from "./theme-toggle";

export const RoleTabOptionsScreen = (): ReactElement => {
	const [viewport, setViewport] = useState<"phone" | "desktop">("phone");
	const [theme, setTheme] = useAtom(themePreferenceAtom);
	if (process.env.EXPO_PUBLIC_REVIEW_MODE !== "true")
		return <EmptyState title="Review unavailable" />;
	return (
		<AppLayout title="Tab styles">
			<Stack gap="lg">
				<ThemeToggle value={theme} onValueChange={setTheme} />
				<Row justify="between" wrap>
					<SegmentedControl
						label="Viewport"
						value={viewport}
						onValueChange={setViewport}
						options={[
							{ value: "phone", label: "Phone" },
							{ value: "desktop", label: "Desktop" },
						]}
					/>
					<Row gap="xs">
						<RoleStyleLabel roleKind="coach" />
						<RoleStyleLabel roleKind="admin" />
					</Row>
				</Row>
				<Grid gap="lg">
					<RoleTabPreview
						title="A · Current glow"
						treatment="glow"
						viewport={viewport}
					/>
					<RoleTabPreview
						title="B · Small dot"
						treatment="dot"
						viewport={viewport}
					/>
				</Grid>
				<Grid gap="lg">
					<RoleTabPreview
						title="C · Underline"
						treatment="underline"
						viewport={viewport}
					/>
					<RoleTabPreview
						title="D · Role label"
						treatment="label"
						viewport={viewport}
					/>
				</Grid>
			</Stack>
		</AppLayout>
	);
};
