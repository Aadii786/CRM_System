import "server-only";
import { Op } from "sequelize";
import db from "@/lib/db";
import { hasPermission, getAccessibleDepartmentKeys } from "@/lib/permissions/rbac";
import { departmentIdsForKeys } from "./departmentService";

const { Contact, Company, Deal, Campaign, Task, Conversation } = db;

/**
 * Global search (requirements #58): categorized results across every
 * module the header search overlay supports, scoped server-side to the
 * user's permissions and accessible departments - never trusts anything
 * the client sends beyond the query text itself.
 */
export async function globalSearch(user, query) {
  const q = (query || "").trim();
  if (q.length < 2) return { contacts: [], companies: [], deals: [], campaigns: [], tasks: [], conversations: [] };

  const deptKeys = getAccessibleDepartmentKeys(user, ["marketing", "ikl-hsm"]);
  const deptIds = await departmentIdsForKeys(deptKeys);
  const like = { [Op.like]: `%${q}%` };

  const [contacts, companies, deals, campaigns, tasks] = await Promise.all([
    hasPermission(user, "contacts.view") && deptIds.length
      ? Contact.findAll({
          where: { departmentId: { [Op.in]: deptIds }, [Op.or]: [{ firstName: like }, { lastName: like }, { email: like }] },
          limit: 5,
        })
      : [],
    hasPermission(user, "companies.view") && deptIds.length
      ? Company.findAll({ where: { departmentId: { [Op.in]: deptIds }, name: like }, limit: 5 })
      : [],
    hasPermission(user, "deals.view") && deptIds.length
      ? Deal.findAll({ where: { departmentId: { [Op.in]: deptIds }, name: like }, limit: 5 })
      : [],
    hasPermission(user, "campaigns.view") && deptIds.length
      ? Campaign.findAll({ where: { departmentId: { [Op.in]: deptIds }, name: like }, limit: 5 })
      : [],
    hasPermission(user, "tasks.view") && deptIds.length
      ? Task.findAll({ where: { departmentId: { [Op.in]: deptIds }, title: like }, limit: 5 })
      : [],
  ]);

  return {
    contacts: contacts.map((c) => ({ id: c.id, label: `${c.firstName} ${c.lastName}`, sub: c.email, href: `/contacts/${c.id}` })),
    companies: companies.map((c) => ({ id: c.id, label: c.name, sub: c.industry, href: `/companies/${c.id}` })),
    deals: deals.map((d) => ({ id: d.id, label: d.name, sub: `PKR ${Number(d.value).toLocaleString()}`, href: `/deals/${d.id}` })),
    campaigns: campaigns.map((c) => ({ id: c.id, label: c.name, sub: c.status, href: `/campaigns/${c.id}` })),
    tasks: tasks.map((t) => ({ id: t.id, label: t.title, sub: t.status, href: `/tasks/${t.id}` })),
    conversations: [],
  };
}
