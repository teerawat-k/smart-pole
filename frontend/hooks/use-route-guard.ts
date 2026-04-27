import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { usePermission } from "@/hooks/use-permission";

interface RouteRule {
  prefix: string;
  /** exact menuAction check — menus:<action> */
  menuAction?: string;
  /** prefix check — has any menus:<prefix>* */
  menuPrefix?: string;
}

/**
 * Route rules ordered from most-specific to least-specific.
 * First match wins — more specific sub-routes must come before their parent.
 */
const ROUTE_RULES: RouteRule[] = [
  // settings sub-routes: each has its own permission
  { prefix: "/settings/branches", menuAction: "settings-branch" },
  { prefix: "/settings/departments", menuAction: "settings-department" },
  { prefix: "/settings/positions", menuAction: "settings-position" },
  { prefix: "/settings/service-areas", menuAction: "settings-service-area" },
  { prefix: "/settings/employees", menuAction: "settings-employee" },
  { prefix: "/settings/roles", menuAction: "settings-role" },
  { prefix: "/settings/product-categories", menuAction: "settings-product-category" },
  { prefix: "/settings/customers", menuAction: "settings-customer" },
  { prefix: "/settings/products", menuAction: "settings-product" },
  { prefix: "/settings/approval-configs", menuAction: "settings-approval-config" },
  { prefix: "/settings/approval-thresholds", menuAction: "settings-quotation-threshold" },
  { prefix: "/settings/logo-types", menuAction: "settings-logo-type" },
  { prefix: "/settings/sales-channels", menuAction: "settings-sales-channel" },
  { prefix: "/settings/vat-methods", menuAction: "settings-vat-method" },
  { prefix: "/settings/discount-types", menuAction: "settings-discount-type" },
  { prefix: "/settings/price-valid-options", menuAction: "settings-price-valid-option" },
  { prefix: "/settings/work-histories", menuAction: "settings-work-history" },
  { prefix: "/settings/size-quantity-ranges", menuAction: "settings-size-quantity-range" },
  // settings catch-all: needs at least one settings-* permission
  { prefix: "/settings", menuPrefix: "settings-" },

  // top-level modules
  { prefix: "/product-component", menuAction: "product-component" },
  { prefix: "/approvals", menuAction: "approvals" },
  { prefix: "/quotations", menuAction: "quotations" },
  { prefix: "/sale-orders", menuAction: "sale-orders" },
  { prefix: "/sample-approve", menuAction: "sample-approve" },
  { prefix: "/deliveries", menuAction: "deliveries" },
  { prefix: "/reports", menuAction: "reports" },
  { prefix: "/quotation-payment-approvers", menuAction: "settings-quotation-threshold" },
];

/**
 * Redirect to /dashboard if the user lacks permission for the current route.
 * Pages without a matching rule (e.g. /dashboard, /notifications) are always allowed.
 */
export function useRouteGuard(): void {
  const pathname = usePathname();
  const router = useRouter();
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const { hasMenuPermission, hasAnyMenuPrefix } = usePermission();

  useEffect(() => {
    if (!hasHydrated) return; // รอ rehydrate ก่อนค่อยเช็ค permission

    const rule = ROUTE_RULES.find((r) => pathname === r.prefix || pathname.startsWith(r.prefix + "/"));
    if (!rule) return; // no rule → always allowed

    const isAllowed = rule.menuPrefix
      ? hasAnyMenuPrefix(rule.menuPrefix)
      : rule.menuAction
        ? hasMenuPermission(rule.menuAction)
        : true;

    if (!isAllowed) {
      router.replace("/dashboard");
    }
  }, [pathname, router, hasHydrated, hasMenuPermission, hasAnyMenuPrefix]);
}
