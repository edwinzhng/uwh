import { type ReactElement, useContext, useEffect, useState } from "react";
import { Image, View } from "react-native";
import { avatarColors } from "./avatar-colors";
import { AvatarSourceContext, avatarPhotoId } from "./avatar-source";
import { Icon, type IconName } from "./icon";
import { useTheme } from "./theme";
import { corners, geometry, space } from "./tokens";

export const Avatar = ({
	name,
	compact = false,
	mini = false,
	uri,
	large = false,
	personId,
	icon,
}: {
	name: string;
	compact?: boolean;
	mini?: boolean;
	uri?: string;
	large?: boolean;
	personId?: string;
	icon?: IconName;
}): ReactElement => {
	const theme = useTheme();
	const source = useContext(AvatarSourceContext);
	const photoId =
		source && !icon ? avatarPhotoId(source.photos, name, personId) : undefined;
	const [loaded, setLoaded] = useState<{ id: string; uri: string }>();
	useEffect(() => {
		if (uri || !photoId || !source) return;
		const request = { active: true };
		void source.load(photoId).then((value): void => {
			if (request.active && value) setLoaded({ id: photoId, uri: value });
		});
		return (): void => {
			request.active = false;
		};
	}, [uri, photoId, source]);
	const resolvedUri = uri ?? (loaded?.id === photoId ? loaded?.uri : undefined);
	const colors = avatarColors(name, theme.mode);
	const [failedUri, setFailedUri] = useState<string>();
	const size = large
		? geometry.avatar * 2
		: mini
			? space.lg
			: compact
				? geometry.compactAvatar
				: geometry.avatar;
	return (
		<View
			accessible={false}
			style={{
				backgroundColor: colors.background,
				width: size,
				height: size,
				flexShrink: 0,
				overflow: "hidden",
				borderRadius: corners.pill,
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
