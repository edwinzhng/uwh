"use client";
import { atom, useAtom } from "jotai";
import { useRouter } from "next/navigation";
import type { FormEvent, ReactElement } from "react";

const errorAtom = atom("");
export const AdminLogin = (): ReactElement => {
	const [error, setError] = useAtom(errorAtom);
	const router = useRouter();
	const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
		event.preventDefault();
		const password = new FormData(event.currentTarget).get("password");
		const response = await fetch("/api/admin", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ password }),
		});
		if (response.ok) router.refresh();
		else setError("Incorrect password");
	};
	return (
		<form className="form" style={{ maxWidth: 400 }} onSubmit={submit}>
			<label>
				Admin password
				<input
					type="password"
					name="password"
					required
					autoComplete="current-password"
				/>
			</label>
			<button className="button button-green" type="submit">
				Sign in
			</button>
			{error ? <p role="alert">{error}</p> : undefined}
		</form>
	);
};
