import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { space } from "./tokens";

export const authBackdropPhoto = {
	source: require("../../assets/auth-backdrop.jpg"),
	width: 1800,
	height: 3400,
	players: { x: 550, y: 1189, width: 770, height: 300 },
} as const;

const playersWidthShare = 0.96;
const playersHeightShare = 0.3;
const playersMaxCenterShare = 0.6;
const playersMargin = space.xl;

const reservedPlayersSpace = (scale: number, height: number): number =>
	Math.min(
		playersHeightShare * height,
		authBackdropPhoto.players.height * scale + playersMargin * 2,
	);

export type AuthBackdropGeometry = {
	scale: number;
	playersSpace: number;
};

export type AuthBackdropPlacement = {
	left: number;
	top: number;
	width: number;
	height: number;
};

export const useAuthBackdropGeometry = (): AuthBackdropGeometry => {
	const viewport = useWindowDimensions();
	const { players, width, height } = authBackdropPhoto;
	const playersCenterX = players.x + players.width / 2;
	const playersCenterY = players.y + players.height / 2;
	const fitScale = Math.min(
		(viewport.width * playersWidthShare) / players.width,
		(viewport.height * playersHeightShare) / players.height,
	);
	const coverScale = Math.max(
		viewport.width / 2 / playersCenterX,
		viewport.width / 2 / (width - playersCenterX),
		(viewport.height * playersMaxCenterShare) / playersCenterY,
		viewport.height / (height - playersCenterY),
	);
	const scale = Math.max(fitScale, coverScale);
	return {
		scale,
		playersSpace: reservedPlayersSpace(scale, viewport.height),
	};
};

export const useAuthBackdropPlacement = (
	scale: number,
	logoTop: number | undefined,
): AuthBackdropPlacement => {
	const viewport = useWindowDimensions();
	const insets = useSafeAreaInsets();
	const { players, width, height } = authBackdropPhoto;
	const fallbackLogoTop =
		insets.top + space.lg + reservedPlayersSpace(scale, viewport.height);
	const centerY = (insets.top + (logoTop ?? fallbackLogoTop)) / 2;
	return {
		left: viewport.width / 2 - (players.x + players.width / 2) * scale,
		top: centerY - (players.y + players.height / 2) * scale,
		width: width * scale,
		height: height * scale,
	};
};
