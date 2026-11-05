import { type ReactElement, type ReactNode, useEffect, useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "./button";
import { Dialog } from "./dialog";
import { IconButton } from "./icon-button";
import { RoleTabMarker } from "./role-tab-marker";
import { Row } from "./row";
import { SectionHeading } from "./section-heading";
import { space } from "./tokens";

export const LineupDialog = ({
	children,
	label,
	openRequest,
	preview,
	immersive = false,
	actions,
}: {
	children: ReactNode;
	actions?: ReactNode;
	preview?: ReactNode;
	immersive?: boolean;
	label: string;
	openRequest?: number;
}): ReactElement => {
	const insets = useSafeAreaInsets();
	const [open, setOpen] = useState(openRequest !== undefined);
	useEffect((): void => {
		if (openRequest !== undefined) setOpen(true);
	}, [openRequest]);
	return (
		<>
			<SectionHeading
				badge={
					immersive ? (
						<RoleTabMarker {...{ role: "coach", treatment: "dot" }} />
					) : undefined
				}
				action={
					<Row>
						{actions}
						{!immersive ? (
							<IconButton
								label="View lineup full screen"
								icon="fullscreen"
								onPress={(): void => setOpen(true)}
							/>
						) : undefined}
						{immersive ? (
							<Button
								label={label}
								prefix="fullscreen"
								variant="secondary"
								onPress={(): void => setOpen(true)}
							/>
						) : undefined}
					</Row>
				}
			>
				Teams
			</SectionHeading>
			{preview}
			<Dialog
				isOpen={open}
				onOpenChange={setOpen}
				title="Lineup"
				intent="lineup"
				hideHeader={immersive ? true : undefined}
				scrollable={!immersive}
			>
				{immersive ? (
					<View style={{ flex: 1 }}>
						{children}
						<View
							style={{
								position: "absolute",
								zIndex: 20,
								right: Math.max(space.sm, insets.right),
								top: insets.top + space.sm,
							}}
						>
							<IconButton
								icon="close"
								label="Close lineup"
								onPress={(): void => setOpen(false)}
							/>
						</View>
					</View>
				) : (
					children
				)}
			</Dialog>
		</>
	);
};
