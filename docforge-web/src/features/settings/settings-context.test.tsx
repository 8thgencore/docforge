import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { SettingsProvider } from "@/features/settings/settings-context";
import { SettingsPage } from "@/pages/SettingsPage";

describe("settings persistence", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("saves values to localStorage", async () => {
    const user = userEvent.setup();
    render(
      <SettingsProvider>
        <SettingsPage />
      </SettingsProvider>,
    );

    const baseUrl = screen.getByLabelText("Базовый URL API");
    const apiKey = screen.getByLabelText("X-API-Key");

    await user.clear(baseUrl);
    await user.type(baseUrl, "http://localhost:8300/v1");
    await user.clear(apiKey);
    await user.type(apiKey, "secret");

    await user.click(screen.getByRole("button", { name: "Сохранить" }));

    expect(window.localStorage.getItem("docforge.api.baseUrl")).toBe("http://localhost:8300/v1");
    expect(window.localStorage.getItem("docforge.api.key")).toBe("secret");
  });
});
