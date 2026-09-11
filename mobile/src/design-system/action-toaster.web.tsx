import type { ReactElement } from "react";
import { Toaster } from "sonner";
import { useTheme } from "./theme";
import { corners, font } from "./tokens";
export const ActionToaster = (): ReactElement => {
	const theme = useTheme();
	return (
		<Toaster
			position="bottom-right"
			duration={3000}
			visibleToasts={3}
			closeButton
			theme={theme.background.primary === "#FFFFFF" ? "light" : "dark"}
			toastOptions={{
				style: {
					fontFamily: font.medium,
					background: theme.background.primary,
					color: theme.text.primary,
					borderColor: theme.border,
					borderRadius: corners.control,
				},
			}}
		/>
	);
};
