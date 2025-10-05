"use client";

import { useAtom } from "jotai";
import { useEffect, useState } from "react";
import { Button } from "@/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/card";
import { apiClient } from "@/lib/api";
import { errorAtom, isLoadingAtom } from "@/lib/atoms";

interface User {
	id: number;
	name: string;
	email: string;
}

export default function Home() {
	const [users, setUsers] = useState<User[]>([]);
	const [isLoading] = useAtom(isLoadingAtom);
	const [error] = useAtom(errorAtom);
	const [newUser, setNewUser] = useState({ name: "", email: "" });

	const fetchUsers = async () => {
		try {
			const data = await apiClient.get<User[]>("/api/users");
			setUsers(data);
		} catch (err) {
			console.error("Failed to fetch users:", err);
		}
	};

	const createUser = async () => {
		try {
			const data = await apiClient.post<User>("/api/users", newUser);
			setUsers((prev) => [...prev, data]);
			setNewUser({ name: "", email: "" });
		} catch (err) {
			console.error("Failed to create user:", err);
		}
	};

	const testBackend = async () => {
		try {
			const data = await apiClient.get<{ message: string }>("/api/hello");
			alert(data.message);
		} catch (err) {
			console.error("Failed to test backend:", err);
		}
	};

	useEffect(() => {
		fetchUsers();
	}, []);

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
			<div className="max-w-4xl mx-auto space-y-8">
				<div className="text-center space-y-4">
					<h1 className="text-4xl font-bold text-gray-900">
						UWH - Bun + React + Radix + Jotai + Hono
					</h1>
					<p className="text-lg text-gray-600">
						A modern full-stack application with separate deployable frontend
						and backend
					</p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					<Card>
						<CardHeader>
							<CardTitle>Backend Test</CardTitle>
							<CardDescription>
								Test the Hono backend connection
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<Button onClick={testBackend} disabled={isLoading}>
								{isLoading ? "Testing..." : "Test Backend"}
							</Button>
							{error && (
								<div className="text-red-600 text-sm">Error: {error}</div>
							)}
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Users Management</CardTitle>
							<CardDescription>
								Manage users with Jotai state management
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<input
									type="text"
									placeholder="Name"
									value={newUser.name}
									onChange={(e) =>
										setNewUser((prev) => ({ ...prev, name: e.target.value }))
									}
									className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
								<input
									type="email"
									placeholder="Email"
									value={newUser.email}
									onChange={(e) =>
										setNewUser((prev) => ({ ...prev, email: e.target.value }))
									}
									className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
								<Button
									onClick={createUser}
									disabled={isLoading || !newUser.name || !newUser.email}
									className="w-full"
								>
									{isLoading ? "Creating..." : "Create User"}
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>

				<Card>
					<CardHeader>
						<CardTitle>Users List</CardTitle>
						<CardDescription>
							Users fetched from the Hono backend
						</CardDescription>
					</CardHeader>
					<CardContent>
						{users.length === 0 ? (
							<p className="text-gray-500 text-center py-4">No users found</p>
						) : (
							<div className="space-y-2">
								{users.map((user) => (
									<div
										key={user.id}
										className="flex justify-between items-center p-3 bg-gray-50 rounded-md"
									>
										<div>
											<p className="font-medium">{user.name}</p>
											<p className="text-sm text-gray-600">{user.email}</p>
										</div>
										<span className="text-xs text-gray-500">ID: {user.id}</span>
									</div>
								))}
							</div>
						)}
					</CardContent>
				</Card>

				<div className="text-center text-sm text-gray-500">
					<p>Frontend: Next.js + React + Radix UI + Jotai</p>
					<p>Backend: Hono + Bun (deployable to Vercel)</p>
				</div>
			</div>
		</div>
	);
}
