import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

test("Button applies its variant and lets custom classes override defaults", () => {
  render(
    <>
      <Button>Save</Button>
      <Button variant="secondary" className="px-8">Cancel</Button>
      <Button variant="ghost">Skip</Button>
    </>,
  );
  expect(screen.getByRole("button", { name: "Save" })).toHaveClass("bg-accent");
  expect(screen.getByRole("button", { name: "Cancel" })).toHaveClass("bg-surface-2", "px-8");
  expect(screen.getByRole("button", { name: "Cancel" })).not.toHaveClass("px-4");
  expect(screen.getByRole("button", { name: "Skip" })).toHaveClass("text-muted");
});

test("buttonVariants returns the class list for a variant", () => {
  expect(buttonVariants({ variant: "ghost" })).toContain("text-muted");
});

test("Card and CardTitle render a labelled section", () => {
  render(
    <Card className="extra">
      <CardTitle>Stats</CardTitle>
    </Card>,
  );
  expect(screen.getByRole("heading", { name: "Stats" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Stats" }).closest("section")).toHaveClass("extra");
});

for (const [value, expected] of [[-20, 0], [42.4, 42], [150, 100]] as const) {
  test(`Progress clamps ${value} to ${expected}`, () => {
    render(<Progress value={value} label="Level" />);
    expect(screen.getByRole("progressbar", { name: "Level" })).toHaveAttribute("aria-valuenow", String(expected));
  });
}

test("cn merges conflicting Tailwind classes and drops falsy values", () => {
  expect(cn("p-2", false, "p-4", undefined)).toBe("p-4");
});
