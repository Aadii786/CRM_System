import { Zap, GitBranch, Play, Clock, LogOut, ArrowDown } from "lucide-react";

const TYPE_STYLES = {
  trigger: { icon: Zap, tone: "bg-primary-subtle border-primary-border text-primary-active" },
  condition: { icon: GitBranch, tone: "bg-warning-subtle border-warning-border text-warning" },
  action: { icon: Play, tone: "bg-success-subtle border-success-border text-success" },
  delay: { icon: Clock, tone: "bg-surface-alt border-border text-ink-secondary" },
  exit: { icon: LogOut, tone: "bg-danger-subtle border-danger-border text-danger" },
};

function NodeCard({ node }) {
  const style = TYPE_STYLES[node.type] || TYPE_STYLES.action;
  const Icon = style.icon;
  return (
    <div className={["inline-flex items-center gap-2 rounded-lg border px-3.5 py-2.5 text-sm font-medium shadow-xs", style.tone].join(" ")}>
      <Icon className="size-4 shrink-0" />
      {node.label}
    </div>
  );
}

function buildTree(nodes) {
  const byParent = new Map();
  for (const node of nodes) {
    const key = node.parentId ?? "root";
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(node);
  }
  for (const list of byParent.values()) list.sort((a, b) => a.order - b.order);
  return byParent;
}

function NodeBranch({ node, childrenByParent }) {
  const children = childrenByParent.get(node.id) || [];
  const yesChild = children.find((c) => c.branch === "yes");
  const noChild = children.find((c) => c.branch === "no");
  const plainChildren = children.filter((c) => !c.branch);

  return (
    <div className="flex flex-col items-center">
      <NodeCard node={node} />
      {children.length > 0 && <ArrowDown className="size-4 text-ink-muted my-1.5" />}

      {(yesChild || noChild) && (
        <div className="flex items-start gap-8 mt-1">
          {yesChild && (
            <div className="flex flex-col items-center">
              <span className="text-[11px] font-semibold text-success uppercase tracking-wide mb-1.5">Yes</span>
              <NodeBranch node={yesChild} childrenByParent={childrenByParent} />
            </div>
          )}
          {noChild && (
            <div className="flex flex-col items-center">
              <span className="text-[11px] font-semibold text-danger uppercase tracking-wide mb-1.5">No</span>
              <NodeBranch node={noChild} childrenByParent={childrenByParent} />
            </div>
          )}
        </div>
      )}

      {plainChildren.map((child) => (
        <NodeBranch key={child.id} node={child} childrenByParent={childrenByParent} />
      ))}
    </div>
  );
}

/** Read-only visual rendering of an automation's node tree (requirements #22-#24). */
export default function AutomationCanvas({ nodes }) {
  if (!nodes || nodes.length === 0) return <p className="text-sm text-ink-muted">No workflow defined yet.</p>;

  const childrenByParent = buildTree(nodes);
  const roots = childrenByParent.get("root") || [];

  return (
    <div className="overflow-x-auto">
      <div className="flex flex-col items-center gap-6 py-4 min-w-max px-4">
        {roots.map((root) => (
          <NodeBranch key={root.id} node={root} childrenByParent={childrenByParent} />
        ))}
      </div>
    </div>
  );
}
