"use client";

import { atom, useAtom } from "jotai";
import { useRouter } from "next/navigation";
import type { FormEvent, ReactElement } from "react";
import { Button, Field, FieldLabel, Form, Text } from "../design-system";

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
		<Form variant="login" onSubmit={submit}>
			<FieldLabel>
				Admin password
				<Field
					type="password"
					name="password"
					required
					autoComplete="current-password"
				/>
			</FieldLabel>
			<Button type="submit">Sign in</Button>
			{error ? <Text role="alert">{error}</Text> : undefined}
		</Form>
	);
};
