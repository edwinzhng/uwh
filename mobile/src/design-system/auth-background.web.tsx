import { LiquidLens } from "@calgarycrocs/design-system/liquid-lens";
import { LensDistortion } from "@paper-design/shaders-react";
import type { ReactElement } from "react";

const poolImage = "/auth-pool.webp";
export const AuthBackground = (): ReactElement => (
	<div
		aria-hidden
		style={{
			position: "absolute",
			inset: 0,
			overflow: "hidden",
			pointerEvents: "none",
			background: "#b5dce7",
		}}
	>
		<style>{`@keyframes pool-drift {from {transform:scale(1.08) translateX(-1%)} to {transform:scale(1.12) translateX(1%)}} .auth-pool-photo {animation:pool-drift 24s ease-in-out infinite alternate} @media(prefers-reduced-motion:reduce){.auth-pool-photo{animation:none}}`}</style>
		<div
			className="auth-pool-photo"
			style={{
				position: "absolute",
				inset: -20,
				backgroundImage: `linear-gradient(rgba(220,242,247,.35),rgba(175,214,228,.2)),url("${poolImage}")`,
				backgroundSize: "cover",
				backgroundPosition: "center",
				filter: "blur(5px)",
				transform: "scale(1.08)",
			}}
		/>
		<div
			style={{
				position: "absolute",
				inset: 0,
				opacity: 0.32,
				pointerEvents: "none",
			}}
		>
			<LensDistortion
				image={poolImage}
				width="100%"
				height="100%"
				fit="cover"
				spread={0.18}
				dispersion={0.22}
				perspective={0.8}
				focusCenter={1}
				focusEdges={0.6}
				swirl={0.04}
				lensBulge={0.07}
				count={8}
				grainMixer={0}
				grainOverlay={0}
				minPixelRatio={1}
				maxPixelCount={1000000}
			/>
		</div>
		<LiquidLens imageSrc={poolImage} areaSelector="#auth-surface" />
	</div>
);
