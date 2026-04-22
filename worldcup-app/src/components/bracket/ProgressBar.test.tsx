import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProgressBar } from "./ProgressBar";

describe("ProgressBar", () => {
  it("displays current pick count in display font", () => {
    render(<ProgressBar current={17} total={31} />);
    // Count appears in the summary; total appears separately with a slash.
    expect(screen.getByText("17").className).toContain("font-display");
    expect(screen.getByText(/\/ 31 picks/).textContent).toContain("/ 31 picks");
  });

  it("displays the completion percentage", () => {
    render(<ProgressBar current={17} total={31} />);
    // Math.round(17/31*100) = 55
    expect(screen.getByText("55%")).toBeTruthy();
  });

  it("has progressbar role with correct aria attributes", () => {
    render(<ProgressBar current={17} total={31} />);
    const bar = screen.getByRole("progressbar");
    expect(bar.getAttribute("aria-valuenow")).toBe("17");
    expect(bar.getAttribute("aria-valuemax")).toBe("31");
    expect(bar.getAttribute("aria-label")).toBe("Bracket completion progress");
  });

  it("renders 0 count and 0% when no picks made", () => {
    render(<ProgressBar current={0} total={31} />);
    expect(screen.getByText("0")).toBeTruthy();
    expect(screen.getByText("0%")).toBeTruthy();
  });

  it("renders 100% when bracket is complete", () => {
    render(<ProgressBar current={31} total={31} />);
    expect(screen.getByText("100%")).toBeTruthy();
  });

  it("overall fill bar width reflects pick percentage (Math.round)", () => {
    render(<ProgressBar current={17} total={31} />);
    const fill = screen.getByRole("progressbar").firstElementChild as HTMLElement;
    expect(fill.style.width).toBe("55%");
  });

  it("overall fill bar is capped at 100% when current exceeds total", () => {
    render(<ProgressBar current={35} total={31} />);
    const fill = screen.getByRole("progressbar").firstElementChild as HTMLElement;
    expect(fill.style.width).toBe("100%");
  });

  it("renders per-round segment labels (R32, R16, QF, SF, F)", () => {
    render(<ProgressBar current={0} total={31} />);
    expect(screen.getByText("R32")).toBeTruthy();
    expect(screen.getByText("R16")).toBeTruthy();
    expect(screen.getByText("QF")).toBeTruthy();
    expect(screen.getByText("SF")).toBeTruthy();
    expect(screen.getByText("F")).toBeTruthy();
  });

  it("R32 label uses text-brand when all 16 R32 picks are made", () => {
    render(<ProgressBar current={16} total={31} />);
    expect(screen.getByText("R32").className).toContain("text-brand");
    // R16 shouldn't be complete yet
    expect(screen.getByText("R16").className).not.toContain("text-brand");
  });
});
