import { lazy, type ReactElement, Suspense } from "react";
import type { CategoryColor } from "./tokens";

const Shader = lazy(() => import("./watercolor-shader-canvas.web"));
export const WatercolorShader = ({
	category,
	seed,
	animated = true,
}: {
	category: CategoryColor;
	seed?: string;
	animated?: boolean;
}): ReactElement => (
	<Suspense fallback={undefined}>
		<Shader category={category} seed={seed} animated={animated} />
	</Suspense>
);
