import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { UsernameForm } from "@/components/UsernameForm";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock the server action
const mockEnterApp = vi.fn();
vi.mock("@/lib/actions/auth", () => ({
  enterApp: (...args: unknown[]) => mockEnterApp(...args),
}));

describe("UsernameForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders input and button", () => {
    render(<UsernameForm />);
    expect(screen.getByPlaceholderText("Enter your name")).toBeDefined();
    expect(screen.getByRole("button", { name: "Enter" })).toBeDefined();
  });

  it("shows error message when enterApp fails", async () => {
    mockEnterApp.mockResolvedValueOnce({
      success: false,
      error: "Something went wrong. Please try again.",
    });

    render(<UsernameForm />);

    const input = screen.getByPlaceholderText("Enter your name");
    fireEvent.change(input, { target: { value: "Chris" } });
    fireEvent.submit(screen.getByRole("button", { name: "Enter" }));

    await waitFor(() => {
      expect(
        screen.getByText("Something went wrong. Please try again.")
      ).toBeDefined();
    });
  });

  it("redirects to /bracket for new user (unlocked)", async () => {
    mockEnterApp.mockResolvedValueOnce({
      success: true,
      data: {
        userId: 1,
        username: "newuser",
        bracketSubmitted: false,
        isAdmin: false,
        isLocked: false,
        isNewUser: true,
      },
    });

    render(<UsernameForm />);

    const input = screen.getByPlaceholderText("Enter your name");
    fireEvent.change(input, { target: { value: "NewUser" } });
    fireEvent.submit(screen.getByRole("button", { name: "Enter" }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/bracket");
    });
  });

  it("redirects to /leaderboard for submitted bracket", async () => {
    mockEnterApp.mockResolvedValueOnce({
      success: true,
      data: {
        userId: 2,
        username: "returning",
        bracketSubmitted: true,
        isAdmin: false,
        isLocked: false,
        isNewUser: false,
      },
    });

    render(<UsernameForm />);

    const input = screen.getByPlaceholderText("Enter your name");
    fireEvent.change(input, { target: { value: "returning" } });
    fireEvent.submit(screen.getByRole("button", { name: "Enter" }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/leaderboard");
    });
  });

  it("redirects to /leaderboard?locked=1 when brackets are locked", async () => {
    mockEnterApp.mockResolvedValueOnce({
      success: true,
      data: {
        userId: 3,
        username: "lockeduser",
        bracketSubmitted: false,
        isAdmin: false,
        isLocked: true,
        isNewUser: false,
      },
    });

    render(<UsernameForm />);

    const input = screen.getByPlaceholderText("Enter your name");
    fireEvent.change(input, { target: { value: "lockeduser" } });
    fireEvent.submit(screen.getByRole("button", { name: "Enter" }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/leaderboard?locked=1");
    });
  });

  it("disables button and shows Submitting... during submission", async () => {
    let resolveEnterApp: (value: unknown) => void;
    mockEnterApp.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveEnterApp = resolve;
      })
    );

    render(<UsernameForm />);

    const input = screen.getByPlaceholderText("Enter your name");
    fireEvent.change(input, { target: { value: "Test" } });
    fireEvent.submit(screen.getByRole("button", { name: "Enter" }));

    await waitFor(() => {
      const button = screen.getByRole("button", { name: "Submitting..." });
      expect(button).toBeDefined();
      expect((button as HTMLButtonElement).disabled).toBe(true);
    });

    resolveEnterApp!({
      success: true,
      data: {
        userId: 1,
        username: "test",
        bracketSubmitted: false,
        isAdmin: false,
        isLocked: false,
        isNewUser: true,
      },
    });
  });
});
