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
		<div className={className}>
			<div
				className={cn(
					"flex items-end justify-between px-6 pt-8 pb-4 md:pb-0 border-b border-[#cbdbcc] bg-[#eef4f1]",
				)}
			>
				<div className="md:pb-4 w-full md:w-auto">
					{eyebrow && (
						<p className="text-[#4a8a40] text-[10px] font-semibold tracking-[0.15em] uppercase mb-0.5">
							{eyebrow}
						</p>
					)}
					<h1 className="text-[#021e00] text-4xl font-bold leading-none tracking-tight">
						{title}
					</h1>
					{subtitle && (
						<p className="text-[#8aab8a] text-sm mt-1">{subtitle}</p>
					)}
				</div>
				{actions && (
					<div className="hidden md:flex pb-4 items-center gap-3">
						{actions}
					</div>
				)}
			</div>
			{/* Mobile Actions Bar */}
			{actions && (
				<div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-[#cbdbcc] bg-[#eef4f1] gap-3">
					{actions}
				</div>
			)}
		</div>
	);
}
