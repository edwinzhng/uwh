import { createStore, Provider } from "jotai";
import { type ReactElement, useMemo, useState } from "react";
import { ScrollView, useWindowDimensions, View } from "react-native";
import { Button } from "./button";
import { Dialog } from "./dialog";
import { Field } from "./field";
import { GlassPanel } from "./glass-panel";
import { GlassPreviewBackground } from "./glass-preview-background";
import {
	GlassPreviewContext,
	type GlassTreatment,
} from "./glass-preview-context";
import type { IconName } from "./icon";
import { IconButton } from "./icon-button";
import { MessageComposerSurface } from "./message-composer-surface";
import { NavigationControl } from "./navigation-control";
import { PageMaterialBackground } from "./page-material-background";
import { RichMessageEditor } from "./rich-message-editor";
import { Row } from "./row";
import { SegmentedControl } from "./segmented-control";
import { Stack } from "./stack";
import { Text } from "./text";
import { useTheme } from "./theme";
import { corners, geometry, space } from "./tokens";

const previewTabs: { id: string; label: string; icon: IconName }[] = [
	{ id: "home", label: "Home", icon: "home" },
	{ id: "schedule", label: "Schedule", icon: "calendar" },
	{ id: "chats", label: "Chats", icon: "message" },
	{ id: "club", label: "Club", icon: "shield" },
];

type PreviewProps = { treatment?: GlassTreatment; phone: boolean };
const Comparison = ({ treatment, phone }: PreviewProps): ReactElement => {
	const theme = useTheme();
	const [open, setOpen] = useState(false);
	const [tab, setTab] = useState("home");
	const [draft, setDraft] = useState("");
	return (
		<GlassPreviewContext value={treatment}>
			<View
				style={{
					height: phone ? 660 : 500,
					width: "100%",
					maxWidth: phone ? 390 : undefined,
					alignSelf: "center",
					overflow: "hidden",
					borderRadius: corners.overlay,
					borderWidth: geometry.border,
					borderColor: theme.border,
				}}
			>
				{treatment ? (
					<GlassPreviewBackground />
				) : (
					<>
						<View
							style={{
								position: "absolute",
								inset: 0,
								backgroundColor: theme.background.canvas,
							}}
						/>
						<PageMaterialBackground />
					</>
				)}
				<View style={{ padding: space.md, flex: 1, gap: space.lg }}>
					<Row justify="between">
						<GlassPanel padding="none" shape="pill">
							<Button
								label="Player"
								prefix="chevronDown"
								variant="ghost"
								onPress={(): void => setOpen(true)}
							/>
						</GlassPanel>
						<GlassPanel padding="none" shape="pill">
							<Row gap="none">
								<IconButton
									label="Notifications preview"
									icon="bell"
									onPress={(): void => setOpen(true)}
								/>
								<IconButton
									label="Profile preview"
									icon="users"
									onPress={(): void => setOpen(true)}
								/>
							</Row>
						</GlassPanel>
					</Row>
					<Text variant="h1">Next practice</Text>
					<GlassPanel padding="md">
						<Stack gap="xs">
							<Text variant="h3">Monday training</Text>
							<Text tone="secondary">8:30–10 PM · MNP Centre</Text>
							<Button
								label="Open sheet"
								variant="secondary"
								onPress={(): void => setOpen(true)}
							/>
						</Stack>
					</GlassPanel>
					<View style={{ flex: 1, justifyContent: "center", gap: space.sm }}>
						<GlassPanel padding="sm">
							<Text>Meet poolside ten minutes early?</Text>
						</GlassPanel>
						<View style={{ marginLeft: space.xxl }}>
							<GlassPanel padding="sm">
								<Text>See you there.</Text>
							</GlassPanel>
						</View>
						<MessageComposerSurface
							leading={
								<IconButton
									label="Add attachment preview"
									icon="plus"
									onPress={(): void => setOpen(true)}
								/>
							}
							trailing={
								<IconButton
									label="Clear preview draft"
									icon="arrowRight"
									onPress={(): void => setDraft("")}
								/>
							}
						>
							<RichMessageEditor
								embedded
								label="Message preview"
								placeholder="Write a message…"
								value={draft}
								onValueChange={setDraft}
							/>
						</MessageComposerSurface>
					</View>
					<GlassPanel padding="xs" shape="pill">
						<Row justify="between" gap="none">
							{previewTabs.map((item) => (
								<View key={item.id} style={{ flex: 1, minWidth: 0 }}>
									<NavigationControl
										item={{
											label: item.label,
											icon: item.icon,
											selected: tab === item.id,
											onPress: (): void => setTab(item.id),
										}}
										vertical
										glass
									/>
								</View>
							))}
						</Row>
					</GlassPanel>
				</View>
			</View>
			<Dialog
				title="Practice"
				isOpen={open}
				onOpenChange={setOpen}
				footer={<Button label="Done" onPress={(): void => setOpen(false)} />}
			>
				<Stack gap="md">
					<Text variant="h1">Monday training</Text>
					<Text tone="secondary">8:30–10 PM · MNP Centre</Text>
					<Field label="Note" value={draft} onValueChange={setDraft} />
				</Stack>
			</Dialog>
		</GlassPreviewContext>
	);
};
const PreviewContent = (): ReactElement => {
	const theme = useTheme();
	const { width } = useWindowDimensions();
	const [treatment, setTreatment] = useState<GlassTreatment>("satin");
	const [viewport, setViewport] = useState("phone");
	const phone = viewport === "phone";
	return (
		<ScrollView
			contentContainerStyle={{
				padding: space.lg,
				gap: space.lg,
				backgroundColor: theme.background.canvas,
				minHeight: "100%",
			}}
		>
			<Row justify="between" wrap>
				<Text variant="h1">Glass</Text>
			</Row>
			<Row wrap>
				<SegmentedControl
					label="Treatment"
					hideLabel
					value={treatment}
					onValueChange={setTreatment}
					options={[
						{ value: "satin", label: "Satin" },
						{ value: "clear", label: "Clear" },
					]}
				/>
				<SegmentedControl
					label="Viewport"
					hideLabel
					value={viewport}
					onValueChange={setViewport}
					options={[
						{ value: "phone", label: "Phone" },
						{ value: "desktop", label: "Desktop" },
					]}
				/>
			</Row>
			<View
				style={{
					flexDirection: width >= geometry.wide ? "row" : "column",
					gap: space.lg,
				}}
			>
				<View style={{ flex: 1, minWidth: 0, gap: space.sm }}>
					<Text variant="h3">Current</Text>
					<Comparison phone={phone} />
				</View>
				<View style={{ flex: 1, minWidth: 0, gap: space.sm }}>
					<Text variant="h3">
						{treatment === "satin" ? "Satin glass" : "Clear glass"}
					</Text>
					<Comparison treatment={treatment} phone={phone} />
				</View>
			</View>
		</ScrollView>
	);
};
export const GlassPreviewScreen = (): ReactElement => {
	const store = useMemo(() => {
		const preview = createStore();
		return preview;
	}, []);
	return (
		<Provider store={store}>
			<PreviewContent />
		</Provider>
	);
};
