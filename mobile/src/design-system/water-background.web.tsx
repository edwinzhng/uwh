import type { ReactElement } from "react";
import { useTheme } from "./theme";

const grain = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Cpath fill='%23000' filter='url(%23n)' opacity='.22' d='M0 0h180v180H0z'/%3E%3C/svg%3E")`;

export const WaterBackground = (): ReactElement => {
	const theme = useTheme();
	const light = theme.background.primary === "#FFFFFF";
	return (
		<div
			aria-hidden
			style={{
				position: "absolute",
				inset: 0,
				pointerEvents: "none",
				background: light
					? "radial-gradient(ellipse at 0% 100%, #D6E4DF 0%, transparent 65%), radial-gradient(ellipse at 100% 12%, #DBE5EC 0%, transparent 62%), linear-gradient(135deg, #F1F4F3, #E7EEEC)"
					: "radial-gradient(ellipse at 0% 100%, #293330 0%, transparent 65%), radial-gradient(ellipse at 100% 12%, #293137 0%, transparent 62%), #171D20",
			}}
		>
			<div
				style={{
					position: "absolute",
					inset: 0,
					backgroundImage: grain,
					opacity: 0.48,
				}}
			/>
		</div>
	);
};
