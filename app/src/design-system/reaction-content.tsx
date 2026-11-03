import { lazy, type ReactElement, Suspense, useState } from "react";
import { View } from "react-native";
import { Field } from "./field";
import { Icon } from "./icon";
import { IconButton } from "./icon-button";
import { ReactionShortcuts } from "./reaction-shortcuts";
import { Row } from "./row";
import { Text } from "./text";
import { useTheme } from "./theme";
import { corners, space } from "./tokens";

const EmojiPicker = lazy(async () => ({
	default: (await import("./emoji-picker")).EmojiPicker,
}));

export const ReactionContent = ({
	onSelect,
	onClose,
	isDisabled,
	error,
	recent = [],
	selected = [],
}: {
	onSelect: (emoji: string) => void;
	onClose?: () => void;
	isDisabled?: boolean;
	error?: string;
	recent?: string[];
	selected?: string[];
}): ReactElement => {
	const [search, setSearch] = useState("");
	const theme = useTheme();
	const choose = (emoji: string): void => {
		if (!isDisabled) onSelect(emoji);
	};
	return (
		<View
			style={{
				flexShrink: 1,
				minWidth: 0,
				minHeight: 0,
				gap: space.sm,
				overflow: "hidden",
			}}
		>
			<View style={{ flexShrink: 0 }}>
				<Row gap="xs" align="center">
					<View
						style={{
							flex: 1,
							minWidth: 0,
							flexDirection: "row",
							alignItems: "center",
							paddingLeft: space.sm,
							backgroundColor: theme.background.tertiary,
							borderRadius: corners.control,
						}}
					>
						<Icon name="search" tone="secondary" />
						<View style={{ flex: 1, minWidth: 0 }}>
							<Field
								label="Search emojis"
								hideLabel
								variant="composer"
								value={search}
								onValueChange={setSearch}
								placeholder="Search emojis"
								inputMode="search"
								isDisabled={isDisabled}
							/>
						</View>
					</View>
					{onClose ? (
						<IconButton
							label="Close reactions"
							icon="close"
							isDisabled={isDisabled}
							onPress={onClose}
						/>
					) : undefined}
				</Row>
			</View>
			{error ? (
				<Text variant="small" tone="danger">
					{error}
				</Text>
			) : undefined}
			<Suspense fallback={<Text variant="caption">Loading emoji…</Text>}>
				<EmojiPicker
					onSelect={choose}
					search={search}
					isDisabled={isDisabled}
					selected={selected}
					header={
						!search.trim() ? (
							<ReactionShortcuts
								onSelect={choose}
								isDisabled={isDisabled}
								recent={recent}
								selected={selected}
							/>
						) : undefined
					}
				/>
			</Suspense>
		</View>
	);
};
