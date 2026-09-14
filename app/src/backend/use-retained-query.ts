import { useConvex, useQuery } from "convex/react";
import type {
	FunctionArgs,
	FunctionReference,
	FunctionReturnType,
} from "convex/server";
import { useEffect, useRef } from "react";

export const useRetainedQuery = <Query extends FunctionReference<"query">>(
	query: Query,
	args: FunctionArgs<Query> | "skip",
): FunctionReturnType<Query> | undefined => {
	const client = useConvex();
	const latest = useRef(args);
	latest.current = args;
	const key = JSON.stringify(args);
	useEffect(() => {
		if (key === '"skip"') return;
		const current = latest.current;
		if (current === "skip") return;
		return (): void =>
			client.prewarmQuery({
				query,
				args: current,
				extendSubscriptionFor: 30_000,
			});
	}, [client, query, key]);
	return useQuery(query, args);
};
