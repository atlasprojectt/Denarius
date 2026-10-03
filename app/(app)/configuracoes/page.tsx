import { redirect } from "next/navigation";

/**
 * Keep the old personal-settings URL as a bookmark-compatible alias while
 * Preferências owns the canonical route.
 */
export default function LegacyPersonalSettingsPage() {
  redirect("/preferencias");
}
