import "server-only";
import { Op } from "sequelize";
import db from "@/lib/db";
import { hasPermission, getAccessibleDepartmentKeys } from "@/lib/permissions/rbac";
import { departmentIdsForKeys, allDepartmentKeys } from "./departmentService";

const { Contact, Company, Deal, Campaign, Task, Conversation, Note, User } = db;

/**
 * Global search (requirements #58): categorized results across every
 * module the header search overlay supports, scoped server-side to the
 * user's permissions and accessible departments - never trusts anything
 * the client sends beyond the query text itself.
 */
export async function globalSearch(user, query) {
  const q = (query || "").trim();
  if (q.length < 2) return { contacts: [], companies: [], deals: [], campaigns: [], tasks: [], notes: [], conversations: [] };

  const deptKeys = getAccessibleDepartmentKeys(user, await allDepartmentKeys());
  const deptIds = await departmentIdsForKeys(deptKeys);
  const like = { [Op.like]: `%${q}%` };

  const [contacts, companies, deals, campaigns, tasks, noteRows] = await Promise.all([
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
      ? Deal.findAll({ where: { departmentId: { [Op.in]: deptIds }, [Op.or]: [{ name: like }, { referenceNumber: like }] }, limit: 5 })
      : [],
    hasPermission(user, "campaigns.view") && deptIds.length
      ? Campaign.findAll({ where: { departmentId: { [Op.in]: deptIds }, name: like }, limit: 5 })
      : [],
    hasPermission(user, "tasks.view") && deptIds.length
      ? Task.findAll({ where: { departmentId: { [Op.in]: deptIds }, title: like }, limit: 5 })
      : [],
    // Notes carry no department of their own; they inherit it from the record they sit on.
    deptIds.length
      ? Note.findAll({
          where: { body: like },
          include: [
            { model: Contact, attributes: ["id", "firstName", "lastName", "departmentId"] },
            { model: Company, attributes: ["id", "name", "departmentId"] },
            { model: Deal, attributes: ["id", "name", "departmentId"] },
          ],
          order: [["createdAt", "DESC"]],
          limit: 30,
        })
      : [],
  ]);

  const notes = noteRows
    .map((n) => {
      if (n.Deal && hasPermission(user, "deals.view") && deptIds.includes(n.Deal.departmentId)) return { n, where: n.Deal.name, href: `/deals/${n.Deal.id}` };
      if (n.Contact && hasPermission(user, "contacts.view") && deptIds.includes(n.Contact.departmentId)) return { n, where: `${n.Contact.firstName} ${n.Contact.lastName}`, href: `/contacts/${n.Contact.id}` };
      if (n.Company && hasPermission(user, "companies.view") && deptIds.includes(n.Company.departmentId)) return { n, where: n.Company.name, href: `/companies/${n.Company.id}` };
      return null;
    })
    .filter(Boolean)
    .slice(0, 5);

  return {
    contacts: contacts.map((c) => ({ id: c.id, label: `${c.firstName} ${c.lastName}`, sub: c.email, href: `/contacts/${c.id}` })),
    companies: companies.map((c) => ({ id: c.id, label: c.name, sub: c.industry, href: `/companies/${c.id}` })),
    deals: deals.map((d) => ({ id: d.id, label: d.name, sub: d.referenceNumber || `PKR ${Number(d.value).toLocaleString()}`, href: `/deals/${d.id}` })),
    campaigns: campaigns.map((c) => ({ id: c.id, label: c.name, sub: c.status, href: `/campaigns/${c.id}` })),
    tasks: tasks.map((t) => ({ id: t.id, label: t.title, sub: t.status, href: `/tasks/${t.id}` })),
    notes: notes.map(({ n, where, href }) => ({ id: n.id, label: n.body.length > 70 ? `${n.body.slice(0, 70)}...` : n.body, sub: `Note on ${where}`, href })),
    conversations: [],
  };
}
