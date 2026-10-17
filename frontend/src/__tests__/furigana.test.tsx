import { expect, test } from "vitest";
import { render } from "@testing-library/react";
import { Furigana } from "@/components/furigana";

const segments = [{ text: "日本語", reading: "にほんご" }, { text: "を勉強します" }];

test("renders ruby annotations from structured segments", () => {
  const { container } = render(<Furigana segments={segments} />);
  expect(container.querySelector("ruby rt")?.textContent).toBe("にほんご");
});

test("hides furigana without dropping text", () => {
  const { container } = render(<Furigana segments={segments} showReading={false} />);
  expect(container.querySelector("ruby")).toBeNull();
  expect(container.textContent).toBe("日本語を勉強します");
});
