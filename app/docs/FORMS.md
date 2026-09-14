# Form submission

Mobile web inputs must render at least 16px text, including invalid, focused, password, search, and date states. Shared `InputStyles` applies this floor across the app; the landing page has the same rule. Keep user pinch zoom enabled. Errors should not remount or automatically refocus fields; preserve focus and values for correction.

Use `useFormTask` for forms. Call `submit(validate, action)` with validation against the current values and an async action. Render `task.error` once and use `task.busy` to disable inputs, submit buttons, and controls that switch the flow. Use `clear()` when intentionally changing form steps.

Validation errors are snapshots of an actual rejected submission, not continuously derived messages after successful submission. Never show a new required-field error because successful work cleared an input. Preserve input on failure; clear sensitive fields only after success. Do not run validation from an effect watching input resets.

The shared task runner prevents overlapping requests synchronously. Keep submission side effects inside its action, await the backend result, and handle failure through the shared friendly-error translation. Use `run` for auxiliary actions such as resending a code that do not validate the main form.

For Button's lightweight `validationError` pattern, only rejected clicks expose validation. Successful clicks reset that display state, and loading/disabled buttons suppress it. Prefer `useFormTask` for multi-field or multi-step forms.

Verify invalid submission, corrected retry, backend rejection, repeated clicks, successful field clearing, and switching steps. Watch for transient error messages throughout the request, not only the final screen.
