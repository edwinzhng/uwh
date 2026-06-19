"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function SignInPage() {
	const { signIn } = useAuthActions();
	const [signingIn, setSigningIn] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleSignIn = async () => {
		setSigningIn(true);
		setError(null);
		try {
			await signIn("google", { redirectTo: "/practices" });
		} catch {
			setError("Sign-in failed. Coaches only.");
			setSigningIn(false);
		}
	};

	return (
		<div className="flex min-h-screen w-full items-center justify-center bg-[#021e00] p-4">
			<div className="w-full max-w-sm border border-[#1a3a00] bg-white p-8">
				<p className="text-[#8aab8a] text-[10px] font-semibold tracking-[0.15em] uppercase mb-1">
					Calgary
				</p>
				<h1 className="text-[#021e00] text-3xl font-bold leading-tight tracking-tight">
					CROCS
				</h1>
				<p className="text-[#8aab8a] text-[10px] tracking-[0.12em] uppercase mt-1 mb-8">
					Coaching Tool
				</p>

				<Button
					onClick={handleSignIn}
					loading={signingIn}
					size="md"
					className="w-full"
				>
					Sign in with Google
				</Button>

				{error && <p className="text-red-600 text-xs mt-3">{error}</p>}
			</div>
		</div>
	);
}
