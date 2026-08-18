"use server";

import type { BudgetNotification } from "@/lib/home/notifications";
import { getBudgetNotifications } from "@/lib/home/queries";

// On-demand read for the global notification center. A server action keeps the
// always-present header cheap across navigations. The alert list is computed
// from tenant-scoped cockpit findings; there is no client DB access.
export async function fetchBudgetNotifications(): Promise<BudgetNotification[]> {
  return getBudgetNotifications();
}
