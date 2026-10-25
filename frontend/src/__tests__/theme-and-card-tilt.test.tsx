import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { getTheme, setTheme, subscribeTheme, syncThemeColor, themeInitScript, THEME_STORAGE_KEY } from "@/lib/theme";

function setMatchMedia(prefersLight: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: prefersLight && query === "(prefers-color-scheme: light)",
    media: query,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    onchange: null,
  })) as unknown as typeof window.matchMedia;
}

function runInitScript() {
  new Function(themeInitScript)();
}

beforeEach(() => {
  window.localStorage.clear();
  delete document.documentElement.dataset.theme;
  document.head.innerHTML = '<meta name="theme-color" content="#0b0b0c">';
  setMatchMedia(false);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("theme store", () => {
  test("defaults to dark and persists the chosen theme", () => {
    expect(getTheme()).toBe("dark");
    setTheme("light");
    expect(getTheme()).toBe("light");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
  });

  test("updates the theme-color meta tag to match the theme", () => {
    setTheme("light");
    expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute("content", "#f6f6f4");
    setTheme("dark");
    expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute("content", "#0b0b0c");
  });

  test("applies the theme even when localStorage is blocked", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => setTheme("light")).not.toThrow();
    expect(getTheme()).toBe("light");
  });

  test("notifies subscribers and stops after unsubscribe", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeTheme(listener);
    setTheme("light");
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    setTheme("dark");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  test("syncThemeColor is a no-op when the meta tag is missing", () => {
    document.head.innerHTML = "";
    expect(() => syncThemeColor()).not.toThrow();
  });
});

describe("theme init script", () => {
  test("applies the saved theme before paint", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "light");
    runInitScript();
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  test("falls back to the OS light preference when nothing is saved", () => {
    setMatchMedia(true);
    runInitScript();
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  test("ignores an invalid saved value and uses dark by default", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "sepia");
    runInitScript();
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  test("does nothing harmful when storage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => runInitScript()).not.toThrow();
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });
});

describe("ThemeToggle", () => {
  test("switches between light and dark and keeps its label in sync", () => {
    render(<ThemeToggle />);
    const button = screen.getByRole("button", { name: "Switch to light mode" });
    expect(button).toHaveTextContent("Light mode");

    fireEvent.click(button);
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(screen.getByRole("button", { name: "Switch to dark mode" })).toHaveTextContent("Dark mode");

    fireEvent.click(screen.getByRole("button", { name: "Switch to dark mode" }));
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  test("reflects a theme that was already applied before mount", () => {
    setTheme("light");
    render(<ThemeToggle className="extra" />);
    expect(screen.getByRole("button", { name: "Switch to dark mode" })).toHaveClass("extra");
  });
});

describe("Card tilt", () => {
  function mockRect(el: HTMLElement, width = 200, height = 100) {
    vi.spyOn(el, "getBoundingClientRect").mockReturnValue({
      left: 0, top: 0, right: width, bottom: height, width, height, x: 0, y: 0, toJSON: () => ({}),
    } as DOMRect);
  }

  function pointerMove(el: HTMLElement, init: { clientX: number; clientY: number; pointerType?: string }) {
    const event = new MouseEvent("pointermove", { bubbles: true, clientX: init.clientX, clientY: init.clientY });
    Object.defineProperty(event, "pointerType", { value: init.pointerType ?? "mouse" });
    fireEvent(el, event);
  }

  test("tilts toward a mouse pointer and sets the glare position", () => {
    render(<Card>Body</Card>);
    const card = screen.getByText("Body").closest("section") as HTMLElement;
    mockRect(card);

    pointerMove(card, { clientX: 200, clientY: 0 });
    expect(card.style.getPropertyValue("--tilt-y")).toBe("6.00deg");
    expect(card.style.getPropertyValue("--tilt-x")).toBe("6.00deg");
    expect(card.style.getPropertyValue("--glare-x")).toBe("100.0%");
    expect(card.style.getPropertyValue("--glare-y")).toBe("0.0%");
  });

  test("resets the tilt when the pointer leaves", () => {
    render(<Card>Body</Card>);
    const card = screen.getByText("Body").closest("section") as HTMLElement;
    mockRect(card);
    pointerMove(card, { clientX: 0, clientY: 100 });
    fireEvent.pointerLeave(card);
    expect(card.style.getPropertyValue("--tilt-x")).toBe("0deg");
    expect(card.style.getPropertyValue("--tilt-y")).toBe("0deg");
  });

  test("ignores touch input so touch screens stay flat", () => {
    render(<Card>Body</Card>);
    const card = screen.getByText("Body").closest("section") as HTMLElement;
    mockRect(card);
    pointerMove(card, { clientX: 200, clientY: 0, pointerType: "touch" });
    expect(card.style.getPropertyValue("--tilt-x")).toBe("");
  });

  test("skips the tilt for an element with no layout size", () => {
    render(<Card>Body</Card>);
    const card = screen.getByText("Body").closest("section") as HTMLElement;
    mockRect(card, 0, 0);
    pointerMove(card, { clientX: 10, clientY: 10 });
    expect(card.style.getPropertyValue("--tilt-x")).toBe("");
  });

  test("still calls caller-provided pointer handlers", () => {
    const onMove = vi.fn();
    const onLeave = vi.fn();
    render(<Card onPointerMove={onMove} onPointerLeave={onLeave}>Body</Card>);
    const card = screen.getByText("Body").closest("section") as HTMLElement;
    mockRect(card);
    pointerMove(card, { clientX: 10, clientY: 10 });
    fireEvent.pointerLeave(card);
    expect(onMove).toHaveBeenCalledTimes(1);
    expect(onLeave).toHaveBeenCalledTimes(1);
  });
});
