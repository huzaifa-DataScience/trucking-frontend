import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Set a new password - Goel One",
  description: "Choose a new password for your Goel One account",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
