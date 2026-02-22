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

  it("shows emerald-50 class on selected team in entry mode", () => {
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
    expect(brazilBtn.className).toContain("bg-emerald-50");
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

  it("renders TBD placeholder for null team", () => {
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
});

describe("MatchCard — results mode", () => {
  it("renders team names as non-button elements in results mode", () => {
    render(
      <MatchCard matchId={1} teamA="Brazil" teamB="Germany" selectedTeam="Brazil"
        disabled={true} mode="results" classification="correct" onSelect={noop} />
    );
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("shows emerald-500 background for correct pick (selected row)", () => {
    render(
      <MatchCard matchId={1} teamA="Brazil" teamB="Germany" selectedTeam="Brazil"
        disabled={true} mode="results" classification="correct" onSelect={noop} />
    );
    const el = screen.getByLabelText("Brazil — correct pick");
    expect(el.className).toContain("bg-emerald-500");
  });

  it("shows checkmark ✓ icon for correct pick", () => {
    render(
      <MatchCard matchId={1} teamA="Brazil" teamB="Germany" selectedTeam="Brazil"
        disabled={true} mode="results" classification="correct" onSelect={noop} />
    );
    expect(screen.getByLabelText("Brazil — correct pick").textContent).toContain("✓");
  });

  it("shows red-500 background for wrong pick (selected row)", () => {
    render(
      <MatchCard matchId={1} teamA="Brazil" teamB="Germany" selectedTeam="Germany"
        disabled={true} mode="results" classification="wrong" onSelect={noop} />
    );
    const el = screen.getByLabelText("Germany — wrong pick");
    expect(el.className).toContain("bg-red-500");
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

  it("shows slate-300 background for pending pick (selected row)", () => {
    render(
      <MatchCard matchId={1} teamA="Brazil" teamB="Germany" selectedTeam="Brazil"
        disabled={true} mode="results" classification="pending" onSelect={noop} />
    );
    const el = screen.getByLabelText("Brazil — pending");
    expect(el.className).toContain("bg-slate-300");
  });

  it("unselected team has white background in results mode", () => {
    render(
      <MatchCard matchId={1} teamA="Brazil" teamB="Germany" selectedTeam="Brazil"
        disabled={true} mode="results" classification="correct" onSelect={noop} />
    );
    const el = screen.getByLabelText("Germany");
    expect(el.className).toContain("bg-white");
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
    // No classification prop — should default to "pending" styling
    const el = screen.getByLabelText("Brazil — pending");
    expect(el.className).toContain("bg-slate-300");
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
    // No interactive buttons in readonly mode
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("shows slate-100 class on selected team in readonly mode", () => {
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
    expect(brazilEl.className).toContain("bg-slate-100");
  });

  it("does NOT show emerald-50 on selected team in readonly mode", () => {
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
    expect(brazilEl.className).not.toContain("bg-emerald-50");
  });

  it("unselected team has white background in readonly mode", () => {
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
    expect(germanyEl.className).toContain("bg-white");
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
    // divs won't fire click-based selection; clicking the text does nothing
    const brazilEl = screen.getByText("Brazil");
    await userEvent.click(brazilEl);
    expect(onSelect).not.toHaveBeenCalled();
  });
});
