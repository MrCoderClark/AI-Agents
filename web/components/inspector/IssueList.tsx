import type { GraphIssue } from "@ai-agents/graph";

type IssueListProps = {
  issues: GraphIssue[];
};

export function IssueList({ issues }: IssueListProps) {
  if (issues.length === 0) {
    return null;
  }
  return (
    <ul className="flex flex-col gap-1">
      {issues.map((issue) => (
        <li
          key={`${issue.path}:${issue.message}`}
          className={`text-sm ${issue.severity === "error" ? "text-danger" : "text-warning"}`}
          role="alert"
        >
          {issue.severity === "error" ? "Error" : "Warning"}: {issue.message}
        </li>
      ))}
    </ul>
  );
}
