import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Forgot password - Goel One",
  description: "Get a link to reset your Goel One password",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
