import type { Metadata } from "next";

import { LegalDocument } from "../_components/legal-document";
import { privacyCopy } from "../copy";

// Public route — `proxy.ts` lets /privacidade through without a session, and
// Google's consent screen requires a reachable privacy policy URL (#65).

export const metadata: Metadata = {
  title: `${privacyCopy.title} · Denarius`,
  description: privacyCopy.lead,
};

export default function PrivacyPage() {
  return <LegalDocument doc={privacyCopy} />;
}
