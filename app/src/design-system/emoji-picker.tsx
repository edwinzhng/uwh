import { type ReactElement, useState } from "react";
import { ScrollView } from "react-native";
import { Button } from "./button";
import { emojiData } from "./emoji-data";
import type { EmojiPickerProps } from "./emoji-picker-props";
import { Field } from "./field";
import { Row } from "./row";
import { Select } from "./select";
import { Stack } from "./stack";
import { geometry } from "./tokens";

export const EmojiPicker = ({ onSelect }: EmojiPickerProps): ReactElement => {
	const [search, setSearch] = useState("");
	const [category, setCategory] = useState("people");
	const [skin, setSkin] = useState("0");
	const emojis = search.trim()
		? Object.values(emojiData.emojis).filter((emoji) =>
				`${emoji.name} ${emoji.keywords.join(" ")}`
					.toLowerCase()
					.includes(search.trim().toLowerCase()),
			)
		: (
				emojiData.categories.find((entry) => entry.id === category)?.emojis ??
				[]
			).flatMap((id) => (emojiData.emojis[id] ? [emojiData.emojis[id]] : []));
	return (
		<Stack gap="sm">
			<Field
				label="Search emoji"
				value={search}
				onValueChange={setSearch}
				placeholder="Search"
			/>
			<Row wrap>
				<Select
					label="Category"
					value={category}
					options={emojiData.categories.map((entry) => ({
						value: entry.id,
						label: entry.id,
					}))}
					onValueChange={(value): void => {
						if (value) setCategory(value);
					}}
				/>
				<Select
					label="Skin tone"
					value={skin}
					options={[
						"Default",
						"Light",
						"Medium-light",
						"Medium",
						"Medium-dark",
						"Dark",
					].map((label, index) => ({ value: String(index), label }))}
					onValueChange={(value): void => {
						if (value) setSkin(value);
					}}
				/>
			</Row>
			<ScrollView
				style={{ maxHeight: geometry.popupMaxHeight }}
				keyboardShouldPersistTaps="handled"
			>
				<Row wrap gap="xxs">
					{emojis.map((emoji) => {
						const value =
							emoji.skins.at(Number(skin))?.native ??
							emoji.skins.at(0)?.native ??
							"";
						return (
							<Button
								key={emoji.id}
								label={value}
								accessibilityLabel={emoji.name}
								variant="ghost"
								onPress={(): void => onSelect(value)}
							/>
						);
					})}
				</Row>
			</ScrollView>
		</Stack>
	);
};
