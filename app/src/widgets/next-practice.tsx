import { Divider, HStack, Link, Spacer, Text, VStack } from "@expo/ui/swift-ui";
import {
	backgroundOverlay,
	clipShape,
	containerBackground,
	font,
	foregroundStyle,
	frame,
	lineLimit,
	minimumScaleFactor,
	padding,
	widgetURL,
} from "@expo/ui/swift-ui/modifiers";
import { createWidget, type WidgetEnvironment } from "expo-widgets";
import type {
	PracticeWidgetProps,
	PracticeWidgetRow,
} from "../domain/practice-widget";

export type NextPracticeProps = PracticeWidgetProps;

const NextPractice = (
	props: NextPracticeProps,
	environment: WidgetEnvironment,
): React.JSX.Element => {
	"widget";
	const medium = environment.widgetFamily !== "systemSmall";
	const tones = {
		yes: { background: "#D4F7E6", text: "#153B2C", label: "Yes" },
		no: { background: "#FFE1E5", text: "#421E25", label: "No" },
		waitlist: { background: "#FFE9D4", text: "#432B18", label: "Waitlist" },
		needed: { background: "#E4EFE8", text: "#465044", label: "Reply needed" },
	};
	const rows = props.rows || [];
	const lineup = props.lineup || [];
	const replyButton = (
		label: string,
		destination: string,
	): React.JSX.Element => (
		<Link
			destination={destination}
			modifiers={[
				font({ size: 13, weight: "semibold" }),
				foregroundStyle("#111811"),
				padding({ horizontal: 12, vertical: 3 }),
				backgroundOverlay({ color: "#FFFFFF" }),
				clipShape("capsule"),
			]}
		>
			<Text>{label}</Text>
		</Link>
	);
	const replyRow = (row: PracticeWidgetRow): React.JSX.Element => {
		const tone = tones[row.reply] || tones.needed;
		return (
			<HStack
				key={row.id}
				spacing={6}
				modifiers={[
					padding({ horizontal: 8, vertical: 3 }),
					frame({ maxWidth: 10000, alignment: "leading" }),
					backgroundOverlay({ color: tone.background }),
					clipShape("roundedRectangle", 8),
				]}
			>
				<Text
					modifiers={[
						font({ size: 13, weight: "semibold" }),
						foregroundStyle(tone.text),
						lineLimit(1),
						minimumScaleFactor(0.8),
					]}
				>
					{medium ? `${row.label} · ${row.time}` : row.label}
				</Text>
				<Spacer />
				{medium && row.yes && row.no ? (
					<HStack spacing={6}>
						{replyButton("Yes", row.yes)}
						{replyButton("No", row.no)}
					</HStack>
				) : (
					<Text
						modifiers={[
							font({ size: 13, weight: "bold" }),
							foregroundStyle(tone.text),
							lineLimit(1),
						]}
					>
						{medium || row.reply !== "needed" ? tone.label : "Reply"}
					</Text>
				)}
			</HStack>
		);
	};
	const background = containerBackground("#F1F7F3", "widget");
	const destination = widgetURL(props.destination || "uwh-club://");
	if (!props.day)
		return (
			<VStack
				alignment="leading"
				spacing={4}
				modifiers={[
					frame({ maxWidth: 10000, alignment: "leading" }),
					background,
					destination,
				]}
			>
				<Text
					modifiers={[
						font({ size: 11, weight: "bold" }),
						foregroundStyle("#465044"),
					]}
				>
					NEXT PRACTICE
				</Text>
				<Text
					modifiers={[
						font({ size: medium ? 20 : 17, weight: "bold" }),
						foregroundStyle("#111811"),
						lineLimit(2),
						minimumScaleFactor(0.8),
					]}
				>
					{props.title || "Open UWH Club"}
				</Text>
				{props.message ? (
					<Text modifiers={[font({ size: 14 }), foregroundStyle("#465044")]}>
						{props.message}
					</Text>
				) : null}
			</VStack>
		);
	const details = (
		<VStack
			alignment="leading"
			spacing={3}
			modifiers={[frame({ maxWidth: 10000, alignment: "leading" })]}
		>
			<Text
				modifiers={[
					font({ size: 11, weight: "bold" }),
					foregroundStyle("#465044"),
					lineLimit(1),
					minimumScaleFactor(0.8),
				]}
			>
				{medium
					? "NEXT PRACTICE"
					: `NEXT · ${props.weekday} ${props.day} ${props.month}`}
			</Text>
			<Text
				modifiers={[
					font({ size: medium ? 17 : 16, weight: "bold" }),
					foregroundStyle("#111811"),
					lineLimit(1),
					minimumScaleFactor(0.75),
				]}
			>
				{props.title}
			</Text>
			{props.details ? (
				<Text
					modifiers={[
						font({ size: 12 }),
						foregroundStyle("#465044"),
						lineLimit(1),
						minimumScaleFactor(0.8),
					]}
				>
					{props.details}
				</Text>
			) : null}
			{rows.map(replyRow)}
			{medium
				? lineup.slice(0, 2).map((line) => (
						<Text
							key={line}
							modifiers={[
								font({ size: 12, weight: "semibold" }),
								foregroundStyle("#111811"),
								lineLimit(1),
								minimumScaleFactor(0.8),
							]}
						>
							{line}
						</Text>
					))
				: null}
			{medium && props.lineupNote ? (
				<Text
					modifiers={[
						font({ size: 12 }),
						foregroundStyle("#465044"),
						lineLimit(1),
					]}
				>
					{props.lineupNote}
				</Text>
			) : null}
		</VStack>
	);
	if (!medium)
		return (
			<VStack
				alignment="leading"
				modifiers={[
					frame({ maxWidth: 10000, maxHeight: 10000, alignment: "topLeading" }),
					background,
					destination,
				]}
			>
				{details}
			</VStack>
		);
	return (
		<HStack
			alignment="center"
			spacing={10}
			modifiers={[
				frame({ maxWidth: 10000, maxHeight: 10000 }),
				background,
				destination,
			]}
		>
			<VStack spacing={0} modifiers={[frame({ width: 40 })]}>
				<Text
					modifiers={[
						font({ size: 11, weight: "bold" }),
						foregroundStyle("#465044"),
					]}
				>
					{props.weekday}
				</Text>
				<Text
					modifiers={[
						font({ size: 28, weight: "bold" }),
						foregroundStyle("#111811"),
						minimumScaleFactor(0.8),
					]}
				>
					{props.day}
				</Text>
				<Text
					modifiers={[
						font({ size: 11, weight: "bold" }),
						foregroundStyle("#465044"),
					]}
				>
					{props.month}
				</Text>
			</VStack>
			<Divider />
			{details}
		</HStack>
	);
};
export default createWidget<NextPracticeProps>("NextPractice", NextPractice);
