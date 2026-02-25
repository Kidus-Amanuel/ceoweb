import { expect, test, describe, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import LoginPage from "../../app/(auth)/login/page";

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "common.welcome_back": "Welcome Back",
        "common.enter_details": "Sign in to your CEO AI account to continue.",
        "common.email": "Email Address",
        "common.password": "Password",
        "common.forgot_password": "Forgot Password?",
        "common.remember_me": "Remember me for 30 days",
        "common.signing_in": "Signing In...",
        "common.sign_in": "Sign In",
        "common.or_continue_with": "Or continue with",
        "common.google_login": "Google",
        "common.dont_have_account": "Don't have an account?",
        "common.create_account": "Create an account",
      };
      return translations[key] || key;
    },
  }),
}));

vi.mock("@/app/context/UserContext", () => ({
  useUser: () => ({
    refreshUser: vi.fn(),
    logout: vi.fn(),
  }),
}));

describe("LoginPage", () => {
  afterEach(() => {
    cleanup();
  });

  test("renders welcome message", () => {
    render(<LoginPage />);
    expect(screen.getByText("Welcome Back")).toBeInTheDocument();
  });

  test("renders email and password inputs", () => {
    render(<LoginPage />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  test("renders sign in button", () => {
    render(<LoginPage />);
    expect(
      screen.getByRole("button", { name: /sign in/i }),
    ).toBeInTheDocument();
  });

  test("renders google sign in button", () => {
    render(<LoginPage />);
    expect(screen.getByRole("button", { name: /google/i })).toBeInTheDocument();
  });

  test("renders create account link", () => {
    render(<LoginPage />);
    expect(screen.getByText(/create an account/i)).toBeInTheDocument();
  });
});
