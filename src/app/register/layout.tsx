import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign up - Goel One",
  description: "Create a new Goel One account",
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
