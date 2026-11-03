import type { ReactElement } from "react";
import Svg, { Path } from "react-native-svg";
import { loadingColors } from "./loading-colors";
import {
	loadingWordmarkPath,
	loadingWordmarkViewBox,
} from "./loading-wordmark-path";
import { typography } from "./tokens";
export const LoadingWordmark = ({ width }: { width: number }): ReactElement => (
	<Svg
		width={width}
		height={typography.h1.lineHeight}
		viewBox={loadingWordmarkViewBox}
		preserveAspectRatio="xMidYMid meet"
		aria-hidden={true}
	>
		<Path d={loadingWordmarkPath} fill={loadingColors.text} />
	</Svg>
);
