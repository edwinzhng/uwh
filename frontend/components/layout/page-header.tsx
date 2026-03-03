"use client";

import { cn } from "@/lib/utils";

interface PageHeaderProps {
	eyebrow?: string;
	title: string;
	subtitle?: string;
	actions?: React.ReactNode;
	className?: string;
}

export function PageHeader({
	eyebrow,
	title,
	subtitle,
	actions,
	className,
}: PageHeaderProps) {
	return (
		<div
			className={cn(
				"flex items-end justify-between px-6 pt-8 pb-0 border-b border-[#cbdbcc] bg-[#eef4f1]",
				className,
			)}
		>
			<div className="pb-4">
				{eyebrow && (
					<p className="text-[#4a8a40] text-[10px] font-semibold tracking-[0.15em] uppercase mb-0.5">
						{eyebrow}
					</p>
				)}
				<h1 className="text-[#021e00] text-4xl font-bold leading-none tracking-tight">
					{title}
				</h1>
				{subtitle && <p className="text-[#8aab8a] text-sm mt-1">{subtitle}</p>}
			</div>
			{actions && <div className="pb-4 flex items-center gap-3">{actions}</div>}
		</div>
	);
}
