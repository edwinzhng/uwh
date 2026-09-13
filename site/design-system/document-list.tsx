import type { ReactElement } from "react";
export const DocumentList = ({
	documents,
}: {
	documents: { title: string; url: string; category: string }[];
}): ReactElement => (
	<ul className="policy-explorer">
		{documents.map((file) => (
			<li key={file.url}>
				<a
					className="policy-file"
					href={file.url}
					target="_blank"
					rel="noopener noreferrer"
				>
					<svg
						width="24"
						height="24"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.5"
						strokeLinecap="round"
						strokeLinejoin="round"
						aria-hidden="true"
					>
						<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
						<path d="M14 2v6h6M8 13h8M8 17h6" />
					</svg>
					<span className="policy-file-copy">
						{file.title}
						<small>{file.category}</small>
					</span>
					<span className="policy-file-type">
						{new URL(file.url, "https://calgaryuwh.com").pathname
							.toLowerCase()
							.endsWith(".pdf")
							? "PDF"
							: "Document"}
					</span>
					<svg
						className="policy-external-icon"
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.5"
						strokeLinecap="round"
						strokeLinejoin="round"
						aria-hidden="true"
					>
						<path d="M15 3h6v6M10 14 21 3M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
					</svg>
					<span className="visually-hidden">Opens in a new tab</span>
				</a>
			</li>
		))}
	</ul>
);
