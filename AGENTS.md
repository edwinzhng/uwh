## Coding Style

- Avoid writing comments and use self-documenting code instead, with well-named variables and functions

## TypeScript Usage

- Use Bun and Biome for all code, including linting and formatting, don't use any other tools like ESLint, Prettier, npm, pnpm, etc.
- Use TypeScript for all code; prefer types over interfaces
- Avoid enums; use const objects with 'as const' and 'satifies MyType' assertion
- Use functional components with TypeScript interfaces
- Prefer const with arrow functions over named functions like function x() {...}
- Define strict types for message passing between different parts of the extension
- Prefer `undefined` over `null` in app-owned types and props
  - Only use `null` when required by external schemas/contracts (e.g., GraphQL `Maybe`, DB/API payloads)
- Avoid try/catch blocks unless there's good reason to translate or handle error in that abstraction
- Use explicit return types for all functions
- Prefer functional transforms (`map`, `filter`, `reduce`) over imperative loops for data manipulation; when a loop is needed, use `for (const x of y)` not index-based loops
- Use `.at()` instead of bracket notation for array element access
- Avoid mutable `let` bindings — derive values with `const` and functional expressions instead
- Do not cast types to `any` or use `as` assertions unless explicitly required by external schemas/contracts
- Never cast to `unknown` unless required by external schemas/contracts

## React Usage

- Use declarative JSX
- Use Convex generated types and queries when possible, which provides automatic reactive UI updates, and see `CONVEX.md` for specific examples
- Use jotai for state management when Convex is not used
- Create subcomponents for complex UI elements, avoid massive monolithic components
- Separate out query logic into reusable hooks
- Use proper TypeScript discriminated unions for message types
- Prefer one React component per file
- Sort imports when saving and remove all unused imports

## Backend Usage

- The backend uses [Convex](https://docs.convex.dev/home)
- If anything about Convex is unclear or you are unsure how to use a specific feature, go to the docs site (https://docs.convex.dev/home) to search and read the official documentation before proceeding
