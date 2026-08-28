import Card, { CardHeader } from "./Card";

// Server-safe frame around a client-rendered chart body, so the title,
// description and any header actions never pull the whole chart library
// into a Server Component's bundle.
export default function ChartCard({ title, description, actions, height = "h-72", children }) {
  return (
    <Card>
      <CardHeader title={title} description={description} actions={actions} />
      <div className={height}>{children}</div>
    </Card>
  );
}
