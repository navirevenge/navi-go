import { Card } from "./ui/card";

export function ComingSoon({ title, phase, description }: { title: string; phase: string; description: string }) {
  return (
    <div className="fade-up">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <Card className="mt-6">
        <p className="text-sm text-accent">Planned for {phase}</p>
        <p className="mt-2 text-muted">{description}</p>
      </Card>
    </div>
  );
}
