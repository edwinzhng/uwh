import { type ReactElement, type ReactNode, useEffect, useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "./button";
import { Dialog } from "./dialog";
import { IconButton } from "./icon-button";
import { SectionHeading } from "./section-heading";
import { space } from "./tokens";

export const LineupDialog = ({
	children,
	label,
	openRequest,
	preview,
	immersive = false,
}: {
	children: ReactNode;
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
				action={
					<Button
						label={label}
						variant="secondary"
						onPress={(): void => setOpen(true)}
					/>
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
								left: Math.max(space.sm, insets.left),
								bottom: Math.max(space.sm, insets.bottom),
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
