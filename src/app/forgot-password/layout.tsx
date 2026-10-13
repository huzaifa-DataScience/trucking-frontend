import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Forgot password - Goel App",
  description: "Get a link to reset your Goel App password",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
