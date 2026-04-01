"use client";

import * as ToastPrimitive from "@radix-ui/react-toast";
import { useAtom } from "jotai";
import { X } from "lucide-react";
import { toastsAtom } from "@/lib/toast";
import { cn } from "@/lib/utils";

export function Toaster() {
	const [toasts, setToasts] = useAtom(toastsAtom);

	const dismiss = (id: string) => {
		setToasts((prev) => prev.filter((t) => t.id !== id));
	};

	return (
		<ToastPrimitive.Provider swipeDirection="right">
			{toasts.map((toast) => (
				<ToastPrimitive.Root
					key={toast.id}
					open={true}
					onOpenChange={(open) => {
						if (!open) dismiss(toast.id);
					}}
					duration={toast.type === "success" ? 4000 : 5000}
					className={cn(
						// Base layout
						"flex items-start gap-3 px-4 py-3.5 shadow-lg w-[calc(100vw-2rem)] max-w-sm",
						// Left accent border
						"border-l-4",
						// Slide in from bottom, fade out
						"data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-4 data-[state=open]:fade-in-0",
						"data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-right-full",
						"data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]",
						"data-[swipe=cancel]:translate-x-0 data-[swipe=cancel]:transition-transform",
						"data-[swipe=end]:animate-out data-[swipe=end]:slide-out-to-right-full",
						"duration-300",
						// Type-specific styles
						toast.type === "success"
							? "bg-[#021e00] border-[#298a29] text-[#eef4f1]"
							: "bg-red-700 border-red-400 text-white",
					)}
				>
					<ToastPrimitive.Description className="flex-1 text-sm leading-snug mt-0.5">
						{toast.message}
					</ToastPrimitive.Description>
					<ToastPrimitive.Close
						onClick={() => dismiss(toast.id)}
						className={cn(
							"flex-shrink-0 p-0.5 opacity-70 hover:opacity-100 transition-opacity",
							toast.type === "success" ? "text-[#8aab8a]" : "text-red-200",
						)}
					>
						<X className="h-4 w-4" />
					</ToastPrimitive.Close>
				</ToastPrimitive.Root>
			))}

			<ToastPrimitive.Viewport
				className={cn(
					"fixed z-[100] flex flex-col gap-2 p-4",
					// Mobile: bottom-center
					"bottom-0 left-0 right-0 items-center",
					// Desktop: bottom-right
					"sm:left-auto sm:right-0 sm:items-end",
				)}
			/>
		</ToastPrimitive.Provider>
	);
}
