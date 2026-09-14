import { useEffect, useState } from "react";

export const useSearchTerm = (value: string): string => {
	const [term, setTerm] = useState(value.trim());
	useEffect(() => {
		const timer = setTimeout(() => setTerm(value.trim()), 200);
		return () => clearTimeout(timer);
	}, [value]);
	return term;
};
