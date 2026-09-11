import type { ReactElement } from "react";
import { useTheme } from "./theme";

export const ScrollbarStyles = (): ReactElement => {
	const light = useTheme().background.primary === "#FFFFFF";
	const thumb = light ? "rgba(0,0,0,.22)" : "rgba(255,255,255,.24)";
	const hover = light ? "rgba(0,0,0,.36)" : "rgba(255,255,255,.4)";
	return (
		<style>{`
* { scrollbar-color: ${thumb} transparent; scrollbar-width: thin; }
@supports selector(::-webkit-scrollbar) {
 * { scrollbar-width: auto; scrollbar-color: auto; }
 *::-webkit-scrollbar { width: 10px; height: 10px; }
 *::-webkit-scrollbar-track { background: transparent; }
 *::-webkit-scrollbar-thumb { background: ${thumb}; border: 3px solid transparent; background-clip: padding-box; border-radius: 999px; min-height: 32px; }
 *::-webkit-scrollbar-thumb:hover { background-color: ${hover}; }
 *::-webkit-scrollbar-corner { background: transparent; }
 *::-webkit-scrollbar-button { display: none; width: 0; height: 0; }
}
@media (forced-colors: active) {
 * { scrollbar-color: auto; scrollbar-width: auto; }
}
`}</style>
	);
};
