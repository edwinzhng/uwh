import type { ReactElement } from "react";
import { Toaster } from "sonner-native";
import { useTheme } from "./theme";
export const ActionToaster = (): ReactElement => {
	const theme = useTheme();
	return (
		<Toaster
			position="bottom-center"
			duration={5000}
			enableStacking
			visibleToasts={3}
			closeButton
			theme={theme.background.primary === "#FFFFFF" ? "light" : "dark"}
		/>
	);
};
