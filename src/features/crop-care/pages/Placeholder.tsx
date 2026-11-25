import { Link } from "@tanstack/react-router";
import { Hammer } from "lucide-react";
import { EmptyState, btnPrimary } from "../ui";

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <EmptyState icon={Hammer} title={title} body="This screen is being rebuilt and isn't ready yet." action={<Link to="/" className={btnPrimary}>Home</Link>} />
  );
}
