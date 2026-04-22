import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MatchCard } from "./MatchCard";

const noop = vi.fn();

describe("MatchCard — entry mode", () => {
  it("renders team names as buttons", () => {
    render(
      <MatchCard
        matchId={1}
        teamA="Brazil"
        teamB="Germany"
        selectedTeam={null}
        disabled={false}
        mode="entry"
        onSelect={noop}
      />
    );
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });

  it("applies brand surface to the selected team in entry mode (active emphasis)", () => {
    render(
      <MatchCard
        matchId={1}
        teamA="Brazil"
        teamB="Germany"
        selectedTeam="Brazil"
        disabled={false}
        mode="entry"
        onSelect={noop}
      />
    );
    const brazilBtn = screen.getByLabelText("Brazil wins");
    // New design: selected button uses brand token, not emerald-50
    expect(brazilBtn.className).toContain("bg-brand");
    expect(brazilBtn.getAttribute("aria-pressed")).toBe("true");
  });

  it("sets aria-pressed=false on the non-selected team", () => {
    render(
      <MatchCard
        matchId={1}
        teamA="Brazil"
        teamB="Germany"
        selectedTeam="Brazil"
        disabled={false}
        mode="entry"
        onSelect={noop}
      />
    );
    expect(screen.getByLabelText("Germany wins").getAttribute("aria-pressed"))
      .toBe("false");
  });

  it("calls onSelect with matchId and team on click", async () => {
    const onSelect = vi.fn();
    render(
      <MatchCard
        matchId={1}
        teamA="Brazil"
        teamB="Germany"
        selectedTeam={null}
        disabled={false}
        mode="entry"
        onSelect={onSelect}
      />
    );
    await userEvent.click(screen.getByLabelText("Germany wins"));
    expect(onSelect).toHaveBeenCalledWith(1, "Germany");
  });

  it("renders TBD placeholder for null teams", () => {
    render(
      <MatchCard
        matchId={1}
        teamA={null}
        teamB={null}
        selectedTeam={null}
        disabled={true}
        mode="entry"
        onSelect={noop}
      />
    );
    expect(screen.getAllByText("TBD")).toHaveLength(2);
  });

  it("disabled buttons have disabled attribute in entry mode", () => {
    render(
      <MatchCard
        matchId={1}
        teamA="Brazil"
        teamB="Germany"
        selectedTeam={null}
        disabled={true}
        mode="entry"
        onSelect={noop}
      />
    );
    const buttons = screen.getAllByRole("button");
    expect((buttons[0] as HTMLButtonElement).disabled).toBe(true);
    expect((buttons[1] as HTMLButtonElement).disabled).toBe(true);
  });

  it("muted emphasis uses surface-2 instead of brand for selected team", () => {
    render(
      <MatchCard
        matchId={1}
        teamA="Brazil"
        teamB="Germany"
        selectedTeam="Brazil"
        disabled={false}
        mode="entry"
        onSelect={noop}
        emphasis="muted"
      />
    );
    const brazilBtn = screen.getByLabelText("Brazil wins");
    expect(brazilBtn.className).toContain("bg-surface-2");
    expect(brazilBtn.className).not.toContain("bg-brand ");
  });
});

describe("MatchCard — results mode", () => {
  it("renders team names as non-button elements in results mode", () => {
    render(
      <MatchCard matchId={1} teamA="Brazil" teamB="Germany" selectedTeam="Brazil"
        disabled={true} mode="results" classification="correct" onSelect={noop} />
    );
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("uses success-bg for correct pick (selected row)", () => {
    render(
      <MatchCard matchId={1} teamA="Brazil" teamB="Germany" selectedTeam="Brazil"
        disabled={true} mode="results" classification="correct" onSelect={noop} />
    );
    const el = screen.getByLabelText("Brazil — correct pick");
    expect(el.className).toContain("bg-success-bg");
    expect(el.className).toContain("text-success");
  });

  it("shows checkmark ✓ for correct pick", () => {
    render(
      <MatchCard matchId={1} teamA="Brazil" teamB="Germany" selectedTeam="Brazil"
        disabled={true} mode="results" classification="correct" onSelect={noop} />
    );
    expect(screen.getByLabelText("Brazil — correct pick").textContent).toContain("✓");
  });

  it("uses error-bg for wrong pick (selected row)", () => {
    render(
      <MatchCard matchId={1} teamA="Brazil" teamB="Germany" selectedTeam="Germany"
        disabled={true} mode="results" classification="wrong" onSelect={noop} />
    );
    const el = screen.getByLabelText("Germany — wrong pick");
    expect(el.className).toContain("bg-error-bg");
    expect(el.className).toContain("text-text-subtle");
  });

  it("shows ✗ icon for wrong pick", () => {
    render(
      <MatchCard matchId={1} teamA="Brazil" teamB="Germany" selectedTeam="Germany"
        disabled={true} mode="results" classification="wrong" onSelect={noop} />
    );
    expect(screen.getByLabelText("Germany — wrong pick").textContent).toContain("✗");
  });

  it("applies line-through to team name for wrong pick", () => {
    render(
      <MatchCard matchId={1} teamA="Brazil" teamB="Germany" selectedTeam="Germany"
        disabled={true} mode="results" classification="wrong" onSelect={noop} />
    );
    const el = screen.getByLabelText("Germany — wrong pick");
    const nameSpan = el.querySelector("span.line-through");
    expect(nameSpan).toBeTruthy();
  });

  it("uses surface-2 for pending pick (selected row)", () => {
    render(
      <MatchCard matchId={1} teamA="Brazil" teamB="Germany" selectedTeam="Brazil"
        disabled={true} mode="results" classification="pending" onSelect={noop} />
    );
    const el = screen.getByLabelText("Brazil — pending");
    expect(el.className).toContain("bg-surface-2");
  });

  it("unselected team is muted (text-text-muted) in results mode", () => {
    render(
      <MatchCard matchId={1} teamA="Brazil" teamB="Germany" selectedTeam="Brazil"
        disabled={true} mode="results" classification="correct" onSelect={noop} />
    );
    const el = screen.getByLabelText("Germany");
    expect(el.className).toContain("text-text-muted");
  });

  it("does not call onSelect when clicked in results mode", async () => {
    const onSelect = vi.fn();
    render(
      <MatchCard matchId={1} teamA="Brazil" teamB="Germany" selectedTeam="Brazil"
        disabled={true} mode="results" classification="correct" onSelect={onSelect} />
    );
    await userEvent.click(screen.getByText("Germany"));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("no icon shown for pending pick", () => {
    render(
      <MatchCard matchId={1} teamA="Brazil" teamB="Germany" selectedTeam="Brazil"
        disabled={true} mode="results" classification="pending" onSelect={noop} />
    );
    const el = screen.getByLabelText("Brazil — pending");
    expect(el.textContent).not.toContain("✓");
    expect(el.textContent).not.toContain("✗");
  });

  it("falls back to pending style when selected but classification prop is undefined", () => {
    render(
      <MatchCard matchId={1} teamA="Brazil" teamB="Germany" selectedTeam="Brazil"
        disabled={true} mode="results" onSelect={noop} />
    );
    const el = screen.getByLabelText("Brazil — pending");
    expect(el.className).toContain("bg-surface-2");
  });
});

describe("MatchCard — readonly mode", () => {
  it("renders team names as non-button elements (divs)", () => {
    render(
      <MatchCard
        matchId={1}
        teamA="Brazil"
        teamB="Germany"
        selectedTeam="Brazil"
        disabled={true}
        mode="readonly"
        onSelect={noop}
      />
    );
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("tints selected team with surface-2 in readonly mode", () => {
    render(
      <MatchCard
        matchId={1}
        teamA="Brazil"
        teamB="Germany"
        selectedTeam="Brazil"
        disabled={true}
        mode="readonly"
        onSelect={noop}
      />
    );
    const brazilEl = screen.getByLabelText("Brazil — your pick");
    expect(brazilEl.className).toContain("bg-surface-2");
  });

  it("unselected team renders against the surface background in readonly mode", () => {
    render(
      <MatchCard
        matchId={1}
        teamA="Brazil"
        teamB="Germany"
        selectedTeam="Brazil"
        disabled={true}
        mode="readonly"
        onSelect={noop}
      />
    );
    const germanyEl = screen.getByLabelText("Germany");
    expect(germanyEl.className).toContain("bg-surface");
  });

  it("does not call onSelect on click attempt in readonly mode", async () => {
    const onSelect = vi.fn();
    render(
      <MatchCard
        matchId={1}
        teamA="Brazil"
        teamB="Germany"
        selectedTeam={null}
        disabled={true}
        mode="readonly"
        onSelect={onSelect}
      />
    );
    const brazilEl = screen.getByText("Brazil");
    await userEvent.click(brazilEl);
    expect(onSelect).not.toHaveBeenCalled();
  });
});
