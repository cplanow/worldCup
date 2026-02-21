import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProgressBar } from "./ProgressBar";

describe("ProgressBar", () => {
  it("displays pick count text", () => {
    render(<ProgressBar current={17} total={31} />);
    expect(screen.getByText("17 of 31 picks made")).toBeTruthy();
  });

  it("has progressbar role with correct aria attributes", () => {
    render(<ProgressBar current={17} total={31} />);
    const bar = screen.getByRole("progressbar");
    expect(bar.getAttribute("aria-valuenow")).toBe("17");
    expect(bar.getAttribute("aria-valuemax")).toBe("31");
    expect(bar.getAttribute("aria-label")).toBe("Bracket completion progress");
  });

  it("displays 0 of 31 picks made when no picks made", () => {
    render(<ProgressBar current={0} total={31} />);
    expect(screen.getByText("0 of 31 picks made")).toBeTruthy();
  });

  it("displays 31 of 31 picks made when bracket is complete", () => {
    render(<ProgressBar current={31} total={31} />);
    expect(screen.getByText("31 of 31 picks made")).toBeTruthy();
  });

  it("fill bar is 0% wide with no picks", () => {
    render(<ProgressBar current={0} total={31} />);
    const fill = screen.getByRole("progressbar").firstElementChild as HTMLElement;
    expect(fill.style.width).toBe("0%");
  });

  it("fill bar reflects pick percentage (Math.round)", () => {
    // Math.round(17/31 * 100) = Math.round(54.84) = 55
    render(<ProgressBar current={17} total={31} />);
    const fill = screen.getByRole("progressbar").firstElementChild as HTMLElement;
    expect(fill.style.width).toBe("55%");
  });

  it("fill bar is capped at 100% even if current exceeds total", () => {
    render(<ProgressBar current={35} total={31} />);
    const fill = screen.getByRole("progressbar").firstElementChild as HTMLElement;
    expect(fill.style.width).toBe("100%");
  });
});
