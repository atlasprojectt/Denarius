import { PageTransition } from "@/components/domain/page-transition";

export default function AppTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PageTransition>{children}</PageTransition>;
}
