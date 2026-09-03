import "server-only";
import { Op } from "sequelize";
import db from "@/lib/db";
import { requirePermission, requireDepartmentAccess, getAccessibleDepartmentKeys } from "@/lib/permissions/rbac";
import { departmentIdsForKeys, departmentByKey } from "./departmentService";
import { recordAudit } from "./auditService";

const { ListFolder, ContactList, ContactListMember, Contact, User, Department } = db;

async function scopedDepartmentIds(user) {
  const keys = getAccessibleDepartmentKeys(user, ["marketing", "ikl-hsm"]);
  return departmentIdsForKeys(keys);
}

export async function listFolders(user) {
  requirePermission(user, "lists.view");
  const deptIds = await scopedDepartmentIds(user);
  if (deptIds.length === 0) return [];
  return ListFolder.findAll({
    where: { departmentId: { [Op.in]: deptIds } },
    order: [["name", "ASC"]],
  });
}

export async function createFolder(user, name) {
  requirePermission(user, "lists.create");
  const dept = await departmentByKey(user.department?.key);
  if (!dept) throw new Error("No department scope.");
  const cleanName = name?.trim();
  if (!cleanName) throw new Error("Folder name is required.");

  const folder = await ListFolder.create({ name: cleanName, departmentId: dept.id, createdBy: user.id });
  await recordAudit({ userId: user.id, action: `Created list folder "${cleanName}"`, module: "lists", resourceType: "ListFolder", resourceId: folder.id, departmentId: dept.id });
  return folder;
}

/** Lists (optionally filtered to one folder) with contact counts, newest first - mirrors Brevo's Lists table. */
export async function listLists(user, { folderId } = {}) {
  requirePermission(user, "lists.view");
  const deptIds = await scopedDepartmentIds(user);
  if (deptIds.length === 0) return [];
  const where = { departmentId: { [Op.in]: deptIds } };
  if (folderId) where.folderId = folderId;

  return ContactList.findAll({
    where,
    include: [
      { model: ListFolder, as: "folder", attributes: ["id", "name"] },
      { model: User, as: "creator", attributes: ["id", "name"] },
    ],
    order: [["createdAt", "DESC"]],
  });
}

export async function getList(user, id) {
  requirePermission(user, "lists.view");
  const list = await ContactList.findByPk(id, {
    include: [{ model: ListFolder, as: "folder" }, { model: Department }],
  });
  if (!list) return null;
  requireDepartmentAccess(user, list.Department?.key);
  return list;
}

export async function getListMembers(user, listId, { page = 1, limit = 25 } = {}) {
  const list = await getList(user, listId);
  if (!list) throw new Error("List not found.");

  const { count, rows } = await Contact.findAndCountAll({
    include: [{ model: ContactList, as: "lists", where: { id: listId }, attributes: [] }],
    order: [["firstName", "ASC"]],
    limit,
    offset: (page - 1) * limit,
  });
  return { data: rows, pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) || 1 } };
}

export async function createList(user, { name, folderId }) {
  requirePermission(user, "lists.create");
  const dept = await departmentByKey(user.department?.key);
  if (!dept) throw new Error("No department scope.");
  const cleanName = name?.trim();
  if (!cleanName) throw new Error("List name is required.");
  if (!folderId) throw new Error("A folder is required.");

  const folder = await ListFolder.findByPk(folderId);
  if (!folder || folder.departmentId !== dept.id) throw new Error("Invalid folder.");

  const list = await ContactList.create({ name: cleanName, folderId, departmentId: dept.id, createdBy: user.id });
  await recordAudit({ userId: user.id, action: `Created list "${cleanName}"`, module: "lists", resourceType: "ContactList", resourceId: list.id, departmentId: dept.id });
  return list;
}

export async function deleteList(user, id) {
  requirePermission(user, "lists.delete");
  const list = await getList(user, id);
  if (!list) throw new Error("List not found.");
  await ContactListMember.destroy({ where: { listId: id } });
  await list.destroy();
  await recordAudit({ userId: user.id, action: `Deleted list "${list.name}"`, module: "lists", resourceType: "ContactList", resourceId: id, departmentId: list.departmentId });
}

async function refreshContactCount(listId) {
  const count = await ContactListMember.count({ where: { listId } });
  await ContactList.update({ contactCount: count }, { where: { id: listId } });
}

/** Sets a contact's list membership to exactly `listIds` - used by the contact create/edit form. Silently ignores lists outside the user's department. */
export async function setContactLists(user, contactId, listIds = []) {
  requirePermission(user, "lists.update");
  const contact = await Contact.findByPk(contactId, { include: [Department] });
  if (!contact) throw new Error("Contact not found.");
  requireDepartmentAccess(user, contact.Department?.key);

  const validLists = listIds.length
    ? await ContactList.findAll({ where: { id: { [Op.in]: listIds }, departmentId: contact.departmentId }, attributes: ["id"] })
    : [];
  const validIds = validLists.map((l) => l.id);

  const existing = await ContactListMember.findAll({ where: { contactId }, attributes: ["listId"] });
  const existingIds = existing.map((m) => m.listId);

  const toAdd = validIds.filter((id) => !existingIds.includes(id));
  const toRemove = existingIds.filter((id) => !validIds.includes(id));

  if (toAdd.length) {
    await ContactListMember.bulkCreate(toAdd.map((listId) => ({ contactId, listId, addedAt: new Date() })));
  }
  if (toRemove.length) {
    await ContactListMember.destroy({ where: { contactId, listId: { [Op.in]: toRemove } } });
  }
  for (const listId of [...toAdd, ...toRemove]) {
    await refreshContactCount(listId);
  }
  return validIds;
}

export async function getListsForContact(user, contactId) {
  requirePermission(user, "lists.view");
  const memberships = await ContactListMember.findAll({
    where: { contactId },
    include: [{ model: ContactList, attributes: ["id", "name"] }],
  });
  return memberships.map((m) => m.ContactList).filter(Boolean);
}
