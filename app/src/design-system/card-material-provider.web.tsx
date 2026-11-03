import type { ReactElement, ReactNode } from "react";

export const CardMaterialProvider = ({
	children,
}: {
	children: ReactNode;
}): ReactElement => (
	<>
		<style>{`
@keyframes club-material-base { from { transform:var(--material-from); } to { transform:var(--material-to); } }
@keyframes club-material-wash { 0% { transform:var(--material-from); opacity:var(--material-alpha-start); } 25% { opacity:var(--material-alpha-quarter); } 50% { opacity:var(--material-alpha-middle); } 75% { opacity:var(--material-alpha-three-quarter); } 100% { transform:var(--material-to); opacity:var(--material-alpha-end); } }
.club-material-base { transform:var(--material-from); animation-name:club-material-base; }
.club-material-wash { transform:var(--material-from); opacity:var(--material-alpha-start); animation-name:club-material-wash; }
@media (prefers-reduced-motion:reduce) { .club-material-base, .club-material-wash { animation:none !important; } }
`}</style>
		{children}
	</>
);
