import { checkMotionTokens } from "../../packages/design-system/check-motion";

await checkMotionTokens(`${import.meta.dir}/..`, [
	"../packages/design-system/src/**/*.{ts,tsx,css}",
	"src/design-system/**/*.{ts,tsx,css}",
]);
