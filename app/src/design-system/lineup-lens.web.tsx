import { LensDistortion } from "@paper-design/shaders-react";
import { Asset } from "expo-asset";
import type { ReactElement } from "react";
import artwork from "../../assets/lineup-pool.png";

const image =
	typeof artwork === "number"
		? Asset.fromModule(artwork).uri
		: Array.isArray(artwork)
			? artwork.at(0)?.uri
			: artwork.uri;

const LineupLens = (): ReactElement => (
	<LensDistortion
		image={image}
		width="100%"
		height="100%"
		fit="cover"
		spread={0.12}
		bias={0.1}
		angle={15}
		perspective={0.3}
		count={12}
		dispersion={0.18}
		focusCenter={0.7}
		focusEdges={0.85}
		swirl={0.12}
		lensBulge={0.08}
		minPixelRatio={1}
		maxPixelCount={450000}
		style={{ position: "absolute", inset: 0 }}
	/>
);

export default LineupLens;
