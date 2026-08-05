import type { Metadata } from "next";

import { LegalDocument } from "../_components/legal-document";
import { termsCopy } from "../copy";

// Public route — `proxy.ts` lets /termos through without a session, and Google's
// consent screen requires a reachable terms-of-service URL (#65).

export const metadata: Metadata = {
  title: `${termsCopy.title} · Denarius`,
  description: termsCopy.lead,
};

export default function TermsPage() {
  return <LegalDocument doc={termsCopy} />;
}
