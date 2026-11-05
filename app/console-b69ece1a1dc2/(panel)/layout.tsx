import { createClient } from "@/lib/db/server";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { getAdminRole, getRoleDisplayName } from "@/lib/utils/roles";
import { ADMIN_PATH } from "@/lib/config/admin-path";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const db = await createClient();

  const {
    data: { user },
  } = await db.auth.getUser();

  // Signed out, or signed in without an admin role (super_admin or hotel_admin): the admin
  // sign-in page, which says which account is signed in
  const adminRole = getAdminRole(user);
  if (!user || !adminRole) {
    redirect(`${ADMIN_PATH}/login`);
  }

  const roleDisplayName = getRoleDisplayName(adminRole);
  const hotelIds = user.user_metadata?.hotel_ids || null;

  return (
    <AdminShell
      userId={user.id}
      email={user.email}
      role={adminRole}
      roleDisplayName={roleDisplayName}
      hotelIds={hotelIds}
    >
      {children}
    </AdminShell>
  );
}
