"use client";

import axios from "axios";
import { useState } from "react";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/shared/ui/button/Button";
import { Input } from "@/components/shared/ui/input/Input";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/shared/ui/alert";
import { useUser } from "@/app/context/UserContext";

export function LoginForm() {
  const router = useRouter();
  const { refreshUser } = useUser();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});
    setServerError(null);

    try {
      const response = await axios.post("/api/auth/login", {
        email: formData.email,
        password: formData.password,
      });

      const { profile } = response.data;

      // Refresh global user state immediately after login
      await refreshUser();

      if (!profile) {
        // Fallback if profile is missing
        router.push("/dashboard");
        return;
      }

      // Check onboarding status
      if (profile.onboarding === false) {
        router.push("/onboarding");
        return;
      }

      // Role based redirect
      if (profile.user_type === "super_admin") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      console.error("Login error:", err);

      if (err.response?.status === 400 && err.response?.data?.errors) {
        const newErrors: Record<string, string> = {};
        const apiErrors = err.response.data.errors;

        if (Array.isArray(apiErrors)) {
          apiErrors.forEach((error: any) => {
            const field = error.path?.[0];
            if (field) {
              newErrors[field] = error.message;
            }
          });
        }
        setErrors(newErrors);
      } else {
        setServerError(
          err.response?.data?.message ||
            "An unexpected error occurred during sign in.",
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          Welcome back
        </h1>
        <p className="text-muted-foreground mt-2">
          Sign in to your CEO AI account to continue.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {serverError && (
          <Alert
            variant="destructive"
            className="mb-4 animate-in fade-in slide-in-from-top-2 duration-300"
          >
            <XCircle className="h-4 w-4" />
            <AlertTitle>Login Failed</AlertTitle>
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className={`pl-10 h-11 bg-white ${errors.email ? "border-red-500" : ""}`}
              required
            />
          </div>
          {errors.email && (
            <p className="text-sm text-red-500 mt-1">{errors.email}</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <Link href="#" className="text-sm text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              className={`pl-10 pr-10 h-11 bg-white ${errors.password ? "border-red-500" : ""}`}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="text-sm text-red-500 mt-1">{errors.password}</p>
          )}
        </div>

        <div className="flex items-center gap-2 pt-2">
          <input
            id="remember-me"
            type="checkbox"
            className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
          />
          <label
            htmlFor="remember-me"
            className="text-sm text-muted-foreground cursor-pointer"
          >
            Remember me for 30 days
          </label>
        </div>

        <div>
          <Button
            type="submit"
            className="w-full h-11 text-base font-semibold"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Signing in...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Sign In
                <ArrowRight className="w-4 h-4" />
              </span>
            )}
          </Button>
        </div>

        <div className="relative py-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[#F7F7F7] lg:bg-white px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>

        <div>
          <Button
            type="button"
            variant="outline"
            className="w-full h-11 bg-white border-border hover:bg-slate-50 text-foreground font-medium flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Google
          </Button>
        </div>

        <p className="text-center text-sm text-muted-foreground pt-4">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="text-primary font-medium hover:underline"
          >
            Create an account
          </Link>
        </p>
      </form>
    </div>
  );
}
