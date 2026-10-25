export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "navi-theme";

const THEME_COLORS: Record<Theme, string> = { dark: "#0b0b0c", light: "#f6f6f4" };

const listeners = new Set<() => void>();

export function getTheme(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage can be blocked (private mode, disabled cookies); the theme still applies for this page.
  }
  syncThemeColor();
  listeners.forEach((listener) => listener());
}

export function subscribeTheme(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function syncThemeColor() {
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLORS[getTheme()]);
}

// Runs before first paint so the saved theme is applied without a flash.
// Falls back to the OS preference when nothing is saved yet.
export const themeInitScript = `(function () {
  try {
    var stored = localStorage.getItem("${THEME_STORAGE_KEY}");
    var theme = stored === "light" || stored === "dark"
      ? stored
      : window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    document.documentElement.dataset.theme = theme;
  } catch (e) {}
})();`;
