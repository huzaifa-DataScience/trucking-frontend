"use client";

import { BIDDING_PERMISSIONS } from "@/lib/auth/permission-catalog";

interface UserBiddingPermissionsProps {
  permissions: string[];
  disabled?: boolean;
  onChange: (permissions: string[]) => void;
}

function togglePermission(current: string[], key: string, enabled: boolean): string[] {
  if (enabled) {
    return current.includes(key) ? current : [...current, key];
  }
  return current.filter((p) => p !== key);
}

export function UserBiddingPermissions({
  permissions,
  disabled,
  onChange,
}: UserBiddingPermissionsProps) {
  return (
    <div>
      <dt className="text-xs font-medium text-stone-500 dark:text-stone-400">Bidding access</dt>
      <dd className="mt-2 space-y-2">
        {BIDDING_PERMISSIONS.map((perm) => {
          const checked = permissions.includes(perm.key);
          return (
            <label
              key={perm.key}
              className="flex cursor-pointer gap-2.5 rounded-lg border border-stone-200 bg-stone-50/50 px-2.5 py-2 dark:border-stone-700 dark:bg-stone-900/40"
            >
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-stone-300 text-brand focus:ring-brand"
                checked={checked}
                disabled={disabled}
                onChange={(e) =>
                  onChange(togglePermission(permissions, perm.key, e.target.checked))
                }
              />
              <span className="min-w-0 text-sm">
                <span className="font-medium text-stone-900 dark:text-stone-100">{perm.label}</span>
                <span className="block text-xs text-stone-500 dark:text-stone-400">
                  {perm.description}
                </span>
              </span>
            </label>
          );
        })}
        <p className="text-[11px] text-stone-500 dark:text-stone-400">
          Requires backend <code className="text-[10px]">PATCH /admin/users/:id</code> with{" "}
          <code className="text-[10px]">permissions</code>. User must sign in again for changes to
          apply.
        </p>
      </dd>
    </div>
  );
}
