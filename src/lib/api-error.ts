import { ZodError } from "zod";

export function getRequestErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ZodError) {
    const issue = error.issues[0];

    if (!issue) {
      return fallback;
    }

    if (issue.path[0] === "device") {
      return "Device information could not be processed. Refresh the page and try again.";
    }

    return issue.message;
  }

  return error instanceof Error ? error.message : fallback;
}
