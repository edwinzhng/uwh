import {
	createContext,
	type ReactElement,
	type ReactNode,
	useContext,
} from "react";
import type { RoleTone } from "./role-glow";

const RoleContext = createContext<RoleTone | undefined>(undefined);
export const useRoleTone = (role?: RoleTone): RoleTone | undefined => {
	const inherited = useContext(RoleContext);
	return role ?? inherited;
};
export const RoleScope = ({
	tone,
	children,
}: {
	tone?: RoleTone;
	children: ReactNode;
}): ReactElement => <RoleContext value={tone}>{children}</RoleContext>;
