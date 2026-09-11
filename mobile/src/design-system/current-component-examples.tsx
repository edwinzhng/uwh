import { type ReactElement, useState } from "react";
import { View } from "react-native";
import { actionToast } from "./action-toast";
import { AttendanceChart } from "./attendance-chart";
import { Button } from "./button";
import { GlassPanel } from "./glass-panel";
import { NotificationBell } from "./notification-bell";
import { PersonPicker } from "./person-picker";
import { Row } from "./row";
import { SidebarNavigation } from "./sidebar-navigation";
import { Stack } from "./stack";
import { Surface } from "./surface";
import { Tabs } from "./tabs";
import { Text } from "./text";
import { geometry } from "./tokens";

export const CurrentComponentExamples = (): ReactElement => {
	const [tab, setTab] = useState("profile");
	const [navigation, setNavigation] = useState("Schedule");
	const [person, setPerson] = useState("alex");
	const notify = (): void => actionToast("savedNotifications");
	return (
		<Stack gap="lg">
			<Stack>
				<Text variant="h4">Text buttons and states</Text>
				<Row wrap>
					<Button
						label="Text with icon"
						prefix="plus"
						variant="ghost"
						onPress={notify}
					/>
					<Button label="Delete" variant="danger-text" onPress={notify} />
					<Button
						label="Disabled text"
						variant="ghost"
						isDisabled
						onPress={notify}
					/>
					<Button
						label="Disabled delete"
						variant="danger-text"
						isDisabled
						onPress={notify}
					/>
					<Button
						label="Loading text"
						variant="ghost"
						isLoading
						onPress={notify}
					/>
					<Button
						label="Selected"
						variant="selection"
						isSelected
						onPress={notify}
					/>
					<Button
						label="Compact"
						compact
						variant="secondary"
						onPress={notify}
					/>
				</Row>
			</Stack>
			<Stack>
				<Text variant="h4">Navigation and glass</Text>
				<Text variant="small" tone="secondary">
					Shared translucent backing, blur, border, and shadow. Panel corners
					match the app navigation. Hover the floating controls to darken the
					whole surface.
				</Text>
				<SidebarNavigation
					navigation={[
						{
							label: "Schedule",
							icon: "calendar",
							selected: navigation === "Schedule",
							onPress: (): void => setNavigation("Schedule"),
						},
						{
							label: "Members",
							icon: "users",
							selected: navigation === "Members",
							onPress: (): void => setNavigation("Members"),
						},
					]}
				/>
				<Row justify="between" wrap>
					<GlassPanel padding="none" interactive>
						<NotificationBell count={0} onPress={notify} />
					</GlassPanel>
					<GlassPanel padding="none" interactive>
						<PersonPicker
							value={person}
							options={[
								{ id: "alex", name: "Alex Rivera", relationship: "You" },
								{ id: "sam", name: "Sam Rivera", relationship: "Child" },
							]}
							onValueChange={setPerson}
						/>
					</GlassPanel>
				</Row>
				<View style={{ width: "100%", maxWidth: geometry.popupWidth }}>
					<NotificationBell label="Notifications" count={2} onPress={notify} />
				</View>
			</Stack>
			<Stack>
				<Text variant="h4">Page tabs</Text>
				<Tabs
					page
					label="Example page tabs"
					value={tab}
					onValueChange={setTab}
					options={[
						{ value: "profile", label: "Profile" },
						{ value: "progress", label: "Progress" },
						{ value: "admin", label: "Admin", staffRole: "admin" },
						{ value: "coach", label: "Coach", staffRole: "coach" },
					]}
				/>
				<Text variant="small" tone="secondary">
					Full-width divider with role badges on restricted tabs.
				</Text>
			</Stack>
			<Surface
				header={
					<Row justify="between">
						<Text variant="h4">Card header</Text>
						<Button label="Edit" variant="ghost" onPress={notify} />
					</Row>
				}
			>
				<Text>Shared header slot with an edge-to-edge divider.</Text>
			</Surface>
			<Stack>
				<Text variant="h4">Toasts</Text>
				<Text variant="small" tone="secondary">
					Neutral surface and text; only the status icon carries color.
				</Text>
				<Row wrap>
					{(["success", "error", "warning", "info"] as const).map((kind) => (
						<Button
							key={kind}
							label={kind}
							variant="secondary"
							onPress={(): void => actionToast("savedNotifications", kind)}
						/>
					))}
				</Row>
			</Stack>
			<Stack>
				<Text variant="h4">Attendance chart</Text>
				<AttendanceChart
					data={[
						{ label: "Sep", onTime: 5, late: 1, absent: 1, unmarked: 2 },
						{ label: "Oct", onTime: 6, late: 2, absent: 1, unmarked: 1 },
					]}
				/>
			</Stack>
		</Stack>
	);
};
