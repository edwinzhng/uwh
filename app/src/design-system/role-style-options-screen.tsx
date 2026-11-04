import { type Href, useRouter } from "expo-router";
import type { ReactElement } from "react";
import { AppLayout } from "./app-layout";
import { Badge } from "./badge";
import { Button } from "./button";
import { EmptyState } from "./empty-state";
import { Grid } from "./grid";
import { RoleStyleOption } from "./role-style-option";
import { Row } from "./row";
import { Stack } from "./stack";
import { Text } from "./text";
export const RoleStyleOptionsScreen = (): ReactElement => {
	const router = useRouter();
	if (process.env.EXPO_PUBLIC_REVIEW_MODE !== "true")
		return <EmptyState title="Review unavailable" />;
	const open = (href: Href): void => router.push(href);
	return (
		<AppLayout
			title="Role treatments"
			back={
				<Button
					label="Club"
					prefix="arrowLeft"
					variant="ghost"
					onPress={(): void => router.navigate("/club")}
				/>
			}
		>
			<Stack gap="xl">
				<Grid gap="xl">
					<RoleStyleOption
						treatment="glow"
						title="A · Edge glow"
						detail="Role destinations and actions. Text labels keep the meaning explicit."
						onOpen={open}
					/>
					<RoleStyleOption
						treatment="badge"
						title="B · Badge + icon"
						detail="Explicit role label and tinted icon. No glow."
						onOpen={open}
					/>
					<RoleStyleOption
						treatment="rail"
						title="C · Section rail"
						detail="Mark the section. Keep child cards and actions neutral."
						onOpen={open}
					/>
				</Grid>
				<Row gap="xs" wrap>
					<Text variant="small" tone="secondary">
						Status labels stay unchanged
					</Text>
					<Badge label="Paid" kind="success" />
					<Badge label="Awaiting review" kind="pending" />
				</Row>
			</Stack>
		</AppLayout>
	);
};
