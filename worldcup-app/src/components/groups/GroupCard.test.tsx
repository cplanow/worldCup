import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GroupCard } from "./GroupCard";

const TEAMS = ["Brazil", "Germany", "Argentina", "France"];

function renderCard(
  overrides: Partial<Parameters<typeof GroupCard>[0]> = {}
) {
  const onSave = vi.fn().mockResolvedValue(undefined);
  render(
    <GroupCard
      groupId={1}
      groupName="A"
      teams={TEAMS}
      currentPick={null}
      onSave={onSave}
      disabled={false}
      {...overrides}
    />
  );
  return { onSave };
}

describe("GroupCard", () => {
  it("assigns positions 1st→4th in click order", async () => {
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByRole("button", { name: /Rank Brazil/ }));
    await user.click(screen.getByRole("button", { name: /Rank Germany/ }));

    expect(
      screen.getByRole("button", { name: /Brazil, ranked 1st/ })
    ).toBeDefined();
    expect(
      screen.getByRole("button", { name: /Germany, ranked 2nd/ })
    ).toBeDefined();
  });

  it("clicking a ranked team clears its position", async () => {
    const user = userEvent.setup();
    renderCard();
    await user.click(screen.getByRole("button", { name: /Rank Brazil/ }));
    const brazilBtn = screen.getByRole("button", { name: /Brazil, ranked/ });
    await user.click(brazilBtn);
    // Brazil is unranked again
    expect(
      screen.getByRole("button", { name: /Rank Brazil/ })
    ).toBeDefined();
  });

  it("shows Save Pick only when all four positions filled and dirty", async () => {
    const user = userEvent.setup();
    renderCard();
    expect(screen.queryByRole("button", { name: "Save Pick" })).toBeNull();

    for (const team of TEAMS) {
      await user.click(screen.getByRole("button", { name: new RegExp(`Rank ${team}`) }));
    }
    expect(screen.getByRole("button", { name: "Save Pick" })).toBeDefined();
  });

  it("uses accent token ring for 1st place (gold)", async () => {
    const user = userEvent.setup();
    renderCard();
    await user.click(screen.getByRole("button", { name: /Rank Brazil/ }));
    const brazilBtn = screen.getByRole("button", { name: /Brazil, ranked 1st/ });
    expect(brazilBtn.className).toContain("ring-accent");
  });

  it("does not respond to clicks when disabled", async () => {
    const user = userEvent.setup();
    renderCard({ disabled: true });
    await user.click(screen.getByRole("button", { name: /Rank Brazil/ }));
    // Still rendered as unranked
    expect(screen.getByRole("button", { name: /Rank Brazil/ })).toBeDefined();
  });

  it("shows Saved badge when pick matches currentPick", () => {
    renderCard({
      currentPick: {
        firstPlace: "Brazil",
        secondPlace: "Germany",
        thirdPlace: "Argentina",
        fourthPlace: "France",
      },
    });
    expect(screen.getByText("Saved")).toBeDefined();
  });
});
