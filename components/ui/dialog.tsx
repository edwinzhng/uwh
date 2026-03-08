"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;

const DialogPortal = DialogPrimitive.Portal;

const DialogOverlay = React.forwardRef<
	React.ElementRef<typeof DialogPrimitive.Overlay>,
	React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
	<DialogPrimitive.Overlay
		ref={ref}
		className={cn(
			"fixed inset-0 z-50 bg-[#021e00]/60 backdrop-blur-sm",
			"data-[state=open]: data-[state=closed]:",
			"data-[state=closed]: data-[state=open]:",
			className,
		)}
		{...props}
	/>
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

interface DialogContentProps
	extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
	title?: string;
	subtitle?: string;
	hideClose?: boolean;
}

const DialogContent = React.forwardRef<
	React.ElementRef<typeof DialogPrimitive.Content>,
	DialogContentProps
>(({ className, children, title, subtitle, hideClose, ...props }, ref) => (
	<DialogPortal>
		<DialogOverlay />
		<DialogPrimitive.Content
			ref={ref}
			className={cn(
				"fixed z-50 bg-white shadow-xl h-fit max-h-[90dvh] overflow-y-auto",
				"data-[state=open]: data-[state=closed]:",
				"data-[state=closed]: data-[state=open]:",
				"data-[state=closed]: data-[state=open]:",
				// Mobile: bottom sheet
				"left-0 right-0 bottom-0 top-auto w-full",
				// Desktop: centered modal
				"sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-lg",
				className,
			)}
			{...props}
		>
			{/* Header */}
			<div className="bg-[#021e00] px-6 py-5 flex items-start justify-between">
				<div>
					{subtitle && (
						<DialogPrimitive.Description className="text-[#8aab8a] text-[10px] font-semibold tracking-[0.12em] uppercase mb-1">
							{subtitle}
						</DialogPrimitive.Description>
					)}
					{title ? (
						<DialogPrimitive.Title className="text-[#eef4f1] text-2xl font-semibold">
							{title}
						</DialogPrimitive.Title>
					) : (
						<DialogPrimitive.Title className="sr-only">
							Dialog
						</DialogPrimitive.Title>
					)}
				</div>
				{!hideClose && (
					<DialogClose className="text-[#8aab8a] hover:text-[#eef4f1]  border border-[#4a8a40] p-1.5  ml-6 mt-0.5 flex-shrink-0">
						<X className="h-4 w-4" />
					</DialogClose>
				)}
			</div>

			{/* Content */}
			<div className="bg-[#eef4f1]">{children}</div>
		</DialogPrimitive.Content>
	</DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogFooter = ({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) => (
	<div
		className={cn(
			"flex gap-3 px-6 py-5 bg-white border-t border-[#cbdbcc]",
			className,
		)}
		{...props}
	/>
);

export { Dialog, DialogTrigger, DialogContent, DialogFooter, DialogClose };
