import type { ReactElement, ReactNode } from "react";
export type CategoryGridItemProps = {
	children: ReactNode;
	fullWidth?: boolean;
};
export const CategoryGridItem = ({
	children,
}: CategoryGridItemProps): ReactElement => <>{children}</>;
