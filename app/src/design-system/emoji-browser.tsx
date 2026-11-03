import { type ReactElement, useMemo, useState } from "react";
import { FlatList, View } from "react-native";
import { ActionMenu } from "./action-menu";
import {
	emojiBrowserMetrics,
	emojiCategories,
	emojiColumns,
	emojiResults,
	emojiVariant,
} from "./emoji-browser-model";
import { EmojiChoice } from "./emoji-choice";
import { emojiData } from "./emoji-data";
import type { EmojiPickerProps } from "./emoji-picker-props";
import { Row } from "./row";
import { ScrollArea } from "./scroll-area";
import { Text } from "./text";
import { useTheme } from "./theme";
import { geometry, space } from "./tokens";

export const EmojiBrowser = ({
	onSelect,
	search,
	isDisabled,
	selected = [],
	header,
}: EmojiPickerProps): ReactElement => {
	const theme = useTheme();
	const [category, setCategory] = useState("people");
	const [tone, setTone] = useState(0);
	const [width, setWidth] = useState<number>(geometry.popupWidth);
	const columns = emojiColumns(width);
	const emojis = useMemo(
		() =>
			emojiResults(emojiData.emojis, emojiData.categories, category, search),
		[category, search],
	);
	return (
		<View
			onLayout={({ nativeEvent }): void => setWidth(nativeEvent.layout.width)}
			style={{
				flexShrink: 1,
				minWidth: 0,
				minHeight: 0,
				gap: space.xs,
				overflow: "hidden",
			}}
		>
			<View style={{ flexShrink: 0 }}>
				<Row justify="between" align="center">
					<Text variant="small" tone="secondary">
						{search.trim()
							? "Search results"
							: (emojiCategories[category]?.label ?? category)}
					</Text>
					<ActionMenu
						label="Skin tone"
						icon="more"
						isDisabled={isDisabled}
						groups={[
							{
								id: "tone",
								items: [
									"Default",
									"Light",
									"Medium-light",
									"Medium",
									"Medium-dark",
									"Dark",
								].map((label, value) => ({
									id: String(value),
									label,
									checked: tone === value,
									onSelect: (): void => setTone(value),
								})),
							},
						]}
					/>
				</Row>
			</View>
			<View
				style={{
					height: emojiBrowserMetrics.gridMaxHeight,
					flexShrink: 1,
					minHeight: 0,
					overflow: "hidden",
				}}
			>
				<FlatList
					testID="emoji-grid"
					key={`${columns}:${category}:${search.trim()}`}
					data={emojis}
					numColumns={columns}
					keyExtractor={(emoji): string => emoji.id}
					initialNumToRender={6}
					maxToRenderPerBatch={4}
					windowSize={3}
					keyboardShouldPersistTaps="handled"
					style={{ flex: 1, minHeight: 0 }}
					ListHeaderComponent={header}
					ListHeaderComponentStyle={
						header ? { paddingBottom: space.sm } : undefined
					}
					renderItem={({ item }): ReactElement => {
						const emoji = emojiVariant(item, tone);
						return (
							<View
								style={{
									width: `${100 / columns}%`,
									height: emojiBrowserMetrics.rowHeight,
									alignItems: "center",
								}}
							>
								<EmojiChoice
									emoji={emoji}
									label={item.name}
									onSelect={onSelect}
									isDisabled={isDisabled}
									isSelected={selected.includes(emoji)}
								/>
							</View>
						);
					}}
					ListEmptyComponent={<Text tone="secondary">No emoji found.</Text>}
				/>
			</View>
			{!search.trim() ? (
				<View
					testID="emoji-categories"
					accessibilityRole="toolbar"
					accessibilityLabel="Emoji categories"
					style={{
						height: emojiBrowserMetrics.categoryHeight,
						flexShrink: 0,
						minWidth: 0,
						paddingTop: space.xs,
						borderTopWidth: geometry.border,
						borderTopColor: theme.border,
						backgroundColor: theme.background.primary,
					}}
				>
					<ScrollArea
						horizontal
						showsHorizontalScrollIndicator={false}
						style={{
							height: emojiBrowserMetrics.rowHeight,
							minHeight: emojiBrowserMetrics.rowHeight,
							flexShrink: 0,
						}}
					>
						<Row gap="none">
							{emojiData.categories.map((entry) => (
								<EmojiChoice
									key={entry.id}
									emoji={emojiCategories[entry.id]?.glyph ?? "😀"}
									label={emojiCategories[entry.id]?.label ?? entry.id}
									onSelect={(): void => setCategory(entry.id)}
									isDisabled={isDisabled}
									isSelected={category === entry.id}
								/>
							))}
						</Row>
					</ScrollArea>
				</View>
			) : undefined}
		</View>
	);
};
