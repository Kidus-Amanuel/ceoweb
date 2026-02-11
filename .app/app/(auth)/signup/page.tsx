"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/shared/ui/button";
import { Input } from "@/components/shared/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/shared/ui/card";

export default function SignUpPage() {
  const router = useRouter();

  return (
    <Card className="w-full border-none shadow-none bg-transparent">
      <CardHeader className="p-0 mb-4">
        <CardTitle className="text-page-title">Create your account</CardTitle>
        <p className="mt-1 text-sm text-muted-foreground">
          Join us today and get started
        </p>
      </CardHeader>

      <CardContent className="p-0">
        <form className="space-y-4" action="#" method="POST">
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label
                  htmlFor="name"
                  className="block text-label text-foreground"
                >
                  Full Name
                </label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  placeholder="John Doe"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="email"
                  className="block text-label text-foreground"
                >
                  Email address
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label
                  htmlFor="password"
                  className="block text-label text-foreground"
                >
                  Password
                </label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  placeholder="••••••••"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="confirm-password"
                  className="block text-label text-foreground"
                >
                  Confirm Password
                </label>
                <Input
                  id="confirm-password"
                  name="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center">
            <input
              id="agree-terms"
              name="agree-terms"
              type="checkbox"
              required
              className="h-3 w-3 rounded border-input bg-background text-primary focus:ring-ring"
            />
            <label
              htmlFor="agree-terms"
              className="ml-2 block text-xs text-foreground"
            >
              I agree to the{" "}
              <Link
                href="#"
                className="font-medium text-primary hover:text-primary/80"
              >
                Terms and Conditions
              </Link>
            </label>
          </div>

          <Button
            type="button"
            className="w-full"
            onClick={() => router.push("/onboarding")}
          >
            Create account
          </Button>
        </form>

        <div className="mt-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <Button variant="outline" type="button" className="w-full">
              <span className="sr-only">Sign up with Google</span>
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z"
                  fill="currentColor"
                />
              </svg>
            </Button>
            <Button variant="outline" type="button" className="w-full">
              <span className="sr-only">Sign up with GitHub</span>
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z"
                  clipRule="evenodd"
                />
              </svg>
            </Button>
          </div>
        </div>

        <div className="text-center text-sm mt-4">
          <span className="text-muted-foreground">
            Already have an account?{" "}
          </span>
          <Link
            href="/"
            className="font-medium text-primary hover:text-primary/80"
          >
            Sign in
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
