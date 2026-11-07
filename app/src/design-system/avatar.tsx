import { type ReactElement, useContext, useEffect, useState } from "react";
import { Image, Text as NativeText, View } from "react-native";
import { avatarColors } from "./avatar-colors";
import { AvatarSourceContext, avatarPhotoId } from "./avatar-source";
import { Icon, type IconName } from "./icon";
import { useTheme } from "./theme";
import { corners, font, geometry, space, typography } from "./tokens";

export const Avatar = ({
	name,
	compact = false,
	mini = false,
	uri,
	large = false,
	personId,
	icon,
	initials = false,
	bright = false,
	roundedSquare = false,
	diameter,
}: {
	name: string;
	compact?: boolean;
	mini?: boolean;
	uri?: string;
	large?: boolean;
	personId?: string;
	icon?: IconName;
	initials?: boolean;
	bright?: boolean;
	roundedSquare?: boolean;
	diameter?: number;
}): ReactElement => {
	const theme = useTheme();
	const source = useContext(AvatarSourceContext);
	const photoId =
		source && !icon ? avatarPhotoId(source.photos, name, personId) : undefined;
	const [loaded, setLoaded] = useState<{ id: string; uri: string }>();
	const [failedUri, setFailedUri] = useState<string>();
	useEffect(() => {
		if ((uri && uri !== failedUri) || !photoId || !source) return;
		const request = { active: true };
		void source.load(photoId).then((value): void => {
			if (request.active && value) setLoaded({ id: photoId, uri: value });
		});
		return (): void => {
			request.active = false;
		};
	}, [uri, failedUri, photoId, source]);
	const resolvedUri =
		uri && uri !== failedUri
			? uri
			: loaded?.id === photoId
				? loaded?.uri
				: undefined;
	const colors = avatarColors(name, bright ? "light" : theme.mode);
	const size =
		diameter ??
		(large
			? geometry.avatar * 2
			: mini
				? space.lg
				: compact
					? geometry.compactAvatar
					: geometry.avatar);
	return (
		<View
			accessible={false}
			style={{
				backgroundColor: colors.background,
				width: size,
				height: size,
				flexShrink: 0,
				overflow: "hidden",
				borderRadius: roundedSquare ? corners.panel : corners.pill,
				borderWidth: geometry.border,
				borderColor: `${colors.foreground}18`,
				alignItems: "center",
				justifyContent: "center",
			}}
		>
			{resolvedUri && failedUri !== resolvedUri ? (
				<Image
					source={{ uri: resolvedUri }}
					resizeMode="cover"
					onError={(): void => setFailedUri(resolvedUri)}
					fadeDuration={0}
					style={{ width: size, height: size }}
				/>
			) : initials ? (
				<NativeText
					style={{
						fontFamily: font.semibold,
						fontSize: large
							? typography.h4.fontSize
							: compact || mini
								? typography.navigation.fontSize
								: typography.small.fontSize,
						lineHeight: large
							? typography.h4.lineHeight
							: compact || mini
								? typography.navigation.lineHeight
								: typography.small.lineHeight,
						includeFontPadding: false,
						textAlign: "center",
						color: colors.foreground,
					}}
				>
					{name
						.trim()
						.split(/\s+/)
						.slice(0, 2)
						.map((word) => word.at(0))
						.join("")
						.toLocaleUpperCase()}
				</NativeText>
			) : (
				<Icon
					name={icon ?? "user"}
					color={colors.foreground}
					size={large ? "feature" : compact ? "sm" : "md"}
				/>
			)}
		</View>
	);
};
