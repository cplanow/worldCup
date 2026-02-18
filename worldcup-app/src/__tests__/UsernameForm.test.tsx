import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { UsernameForm } from "@/components/UsernameForm";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock the server action
const mockCreateUser = vi.fn();
vi.mock("@/lib/actions/auth", () => ({
  createUser: (...args: unknown[]) => mockCreateUser(...args),
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

  it("shows error message when createUser fails", async () => {
    mockCreateUser.mockResolvedValueOnce({
      success: false,
      error: "That name is already taken",
    });

    render(<UsernameForm />);

    const input = screen.getByPlaceholderText("Enter your name");
    fireEvent.change(input, { target: { value: "Chris" } });
    fireEvent.submit(screen.getByRole("button", { name: "Enter" }));

    await waitFor(() => {
      expect(screen.getByText("That name is already taken")).toBeDefined();
    });
  });

  it("redirects to /bracket on success", async () => {
    mockCreateUser.mockResolvedValueOnce({
      success: true,
      data: { userId: 1 },
    });

    render(<UsernameForm />);

    const input = screen.getByPlaceholderText("Enter your name");
    fireEvent.change(input, { target: { value: "NewUser" } });
    fireEvent.submit(screen.getByRole("button", { name: "Enter" }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/bracket");
    });
  });

  it("disables button and shows Submitting... during submission", async () => {
    let resolveCreateUser: (value: unknown) => void;
    mockCreateUser.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveCreateUser = resolve;
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

    resolveCreateUser!({ success: true, data: { userId: 1 } });
  });
});
