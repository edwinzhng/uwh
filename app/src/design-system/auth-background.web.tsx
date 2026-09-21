import type { ReactElement } from "react";

const poolImage = "/auth-uwh-motion.jpg";
export const AuthBackground = (): ReactElement => (
	<div
		aria-hidden
		style={{
			position: "absolute",
			inset: 0,
			overflow: "hidden",
			pointerEvents: "none",
			background: "#00394e",
		}}
	>
		<style>{`@keyframes pool-drift {from {transform:scale(1.04) translateX(-.4%)} to {transform:scale(1.06) translateX(.4%)}} .auth-pool-photo {animation:pool-drift 24s ease-in-out infinite alternate} @media(prefers-reduced-motion:reduce){.auth-pool-photo{animation:none}}`}</style>
		<div
			className="auth-pool-photo"
			style={{
				position: "absolute",
				inset: -8,
				backgroundImage: `linear-gradient(rgba(0,38,55,.16),rgba(0,26,40,.34)),url("${poolImage}")`,
				backgroundSize: "cover",
				backgroundPosition: "center",
				transform: "scale(1.04)",
			}}
		/>
	</div>
);
