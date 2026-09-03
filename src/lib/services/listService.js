import "server-only";
import { Op } from "sequelize";
import db from "@/lib/db";
import { requirePermission, requireDepartmentAccess, getAccessibleDepartmentKeys } from "@/lib/permissions/rbac";
import { departmentIdsForKeys, departmentByKey } from "./departmentService";
import { recordAudit } from "./auditService";

const { ListFolder, ContactList, ContactListMember, Contact, Company, User, Department } = db;

async function scopedDepartmentIds(user) {
  const keys = getAccessibleDepartmentKeys(user, ["marketing", "ikl-hsm"]);
  return departmentIdsForKeys(keys);
}

/**
 * Folders, optionally scoped to one company (Company -> Folder -> List ->
 * Contact) or to the general, no-company bucket. Omit `companyId`
 * entirely for the full Folder Management list across both.
 */
export async function listFolders(user, { companyId } = {}) {
  requirePermission(user, "lists.view");
  const deptIds = await scopedDepartmentIds(user);
  if (deptIds.length === 0) return [];
  const where = { departmentId: { [Op.in]: deptIds } };
  if (companyId === "none") where.companyId = null;
  else if (companyId) where.companyId = companyId;

  return ListFolder.findAll({
    where,
    include: [{ model: Company, attributes: ["id", "name"] }],
    order: [["name", "ASC"]],
  });
}

export async function getFolder(user, id) {
  requirePermission(user, "lists.view");
  const folder = await ListFolder.findByPk(id, { include: [{ model: Department }, { model: Company }] });
  if (!folder) return null;
  requireDepartmentAccess(user, folder.Department?.key);
  return folder;
}

export async function createFolder(user, { name, companyId } = {}) {
  requirePermission(user, "lists.create");
  const dept = await departmentByKey(user.department?.key);
  if (!dept) throw new Error("No department scope.");
  const cleanName = name?.trim();
  if (!cleanName) throw new Error("Folder name is required.");

  let resolvedCompanyId = null;
  if (companyId) {
    const company = await Company.findByPk(companyId);
    if (!company || company.departmentId !== dept.id) throw new Error("Invalid company.");
    resolvedCompanyId = company.id;
  }

  const folder = await ListFolder.create({ name: cleanName, companyId: resolvedCompanyId, departmentId: dept.id, createdBy: user.id });
  await recordAudit({ userId: user.id, action: `Created list folder "${cleanName}"`, module: "lists", resourceType: "ListFolder", resourceId: folder.id, departmentId: dept.id });
  return folder;
}

export async function renameFolder(user, id, name) {
  requirePermission(user, "lists.update");
  const folder = await getFolder(user, id);
  if (!folder) throw new Error("Folder not found.");
  const cleanName = name?.trim();
  if (!cleanName) throw new Error("Folder name is required.");
  await folder.update({ name: cleanName });
  await recordAudit({ userId: user.id, action: `Renamed folder to "${cleanName}"`, module: "lists", resourceType: "ListFolder", resourceId: id, departmentId: folder.departmentId });
  return folder;
}

export async function deleteFolder(user, id) {
  requirePermission(user, "lists.delete");
  const folder = await getFolder(user, id);
  if (!folder) throw new Error("Folder not found.");
  const listCount = await ContactList.count({ where: { folderId: id } });
  if (listCount > 0) throw new Error(`Move or delete this folder's ${listCount} list(s) first.`);
  await folder.destroy();
  await recordAudit({ userId: user.id, action: `Deleted folder "${folder.name}"`, module: "lists", resourceType: "ListFolder", resourceId: id, departmentId: folder.departmentId });
}

/** Lists (optionally filtered to one folder), with contact counts, newest first - mirrors Brevo's Lists table. */
export async function listLists(user, { folderId, companyId, q } = {}) {
  requirePermission(user, "lists.view");
  const deptIds = await scopedDepartmentIds(user);
  if (deptIds.length === 0) return [];
  const where = { departmentId: { [Op.in]: deptIds } };
  if (folderId) where.folderId = folderId;
  if (q) where.name = { [Op.like]: `%${q}%` };

  const folderInclude = {
    model: ListFolder,
    as: "folder",
    attributes: ["id", "name", "companyId"],
    include: [{ model: Company, attributes: ["id", "name"] }],
  };
  if (companyId) folderInclude.where = { companyId };

  return ContactList.findAll({
    where,
    include: [folderInclude, { model: User, as: "creator", attributes: ["id", "name"] }],
    order: [["createdAt", "DESC"]],
  });
}

export async function getList(user, id) {
  requirePermission(user, "lists.view");
  const list = await ContactList.findByPk(id, {
    include: [{ model: ListFolder, as: "folder", include: [{ model: Company, attributes: ["id", "name"] }] }, { model: Department }],
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

export async function createList(user, { name, description, folderId }) {
  requirePermission(user, "lists.create");
  const dept = await departmentByKey(user.department?.key);
  if (!dept) throw new Error("No department scope.");
  const cleanName = name?.trim();
  if (!cleanName) throw new Error("List name is required.");
  if (!folderId) throw new Error("A folder is required.");

  const folder = await ListFolder.findByPk(folderId);
  if (!folder || folder.departmentId !== dept.id) throw new Error("Invalid folder.");

  const list = await ContactList.create({ name: cleanName, description: description?.trim() || null, folderId, departmentId: dept.id, createdBy: user.id });
  await recordAudit({ userId: user.id, action: `Created list "${cleanName}"`, module: "lists", resourceType: "ContactList", resourceId: list.id, departmentId: dept.id });
  return list;
}

export async function updateList(user, id, { name, description }) {
  requirePermission(user, "lists.update");
  const list = await getList(user, id);
  if (!list) throw new Error("List not found.");
  const cleanName = name?.trim();
  if (!cleanName) throw new Error("List name is required.");
  await list.update({ name: cleanName, description: description?.trim() || null });
  await recordAudit({ userId: user.id, action: `Renamed list to "${cleanName}"`, module: "lists", resourceType: "ContactList", resourceId: id, departmentId: list.departmentId });
  return list;
}

/** Moves a list into a different folder within the same department (Folder Management: "Move Lists between Folders"). */
export async function moveList(user, id, newFolderId) {
  requirePermission(user, "lists.update");
  const list = await getList(user, id);
  if (!list) throw new Error("List not found.");
  const folder = await ListFolder.findByPk(newFolderId);
  if (!folder || folder.departmentId !== list.departmentId) throw new Error("Invalid destination folder.");
  await list.update({ folderId: folder.id });
  await recordAudit({ userId: user.id, action: `Moved list "${list.name}" to folder "${folder.name}"`, module: "lists", resourceType: "ContactList", resourceId: id, departmentId: list.departmentId });
  return list;
}

export async function duplicateList(user, id) {
  requirePermission(user, "lists.create");
  const list = await getList(user, id);
  if (!list) throw new Error("List not found.");
  const members = await ContactListMember.findAll({ where: { listId: id }, attributes: ["contactId"] });

  const copy = await ContactList.create({
    name: `${list.name} (Copy)`,
    description: list.description,
    folderId: list.folderId,
    departmentId: list.departmentId,
    createdBy: user.id,
    contactCount: members.length,
  });
  if (members.length) {
    await ContactListMember.bulkCreate(members.map((m) => ({ contactId: m.contactId, listId: copy.id, addedAt: new Date() })));
  }
  await recordAudit({ userId: user.id, action: `Duplicated list "${list.name}"`, module: "lists", resourceType: "ContactList", resourceId: copy.id, departmentId: list.departmentId });
  return copy;
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

/** Adds/removes one contact from one list directly - used by the List detail page's "Manage Contacts". */
export async function addContactsToList(user, listId, contactIds = []) {
  requirePermission(user, "lists.update");
  const list = await getList(user, listId);
  if (!list) throw new Error("List not found.");

  const validContacts = contactIds.length
    ? await Contact.findAll({ where: { id: { [Op.in]: contactIds }, departmentId: list.departmentId }, attributes: ["id"] })
    : [];
  const existing = await ContactListMember.findAll({ where: { listId, contactId: { [Op.in]: validContacts.map((c) => c.id) } }, attributes: ["contactId"] });
  const existingIds = new Set(existing.map((m) => String(m.contactId)));
  const toAdd = validContacts.filter((c) => !existingIds.has(String(c.id)));

  if (toAdd.length) {
    await ContactListMember.bulkCreate(toAdd.map((c) => ({ contactId: c.id, listId, addedAt: new Date() })));
    await refreshContactCount(listId);
    await recordAudit({ userId: user.id, action: `Added ${toAdd.length} contact(s) to list "${list.name}"`, module: "lists", resourceType: "ContactList", resourceId: listId, departmentId: list.departmentId });
  }
  return toAdd.length;
}

export async function removeContactFromList(user, listId, contactId) {
  requirePermission(user, "lists.update");
  const list = await getList(user, listId);
  if (!list) throw new Error("List not found.");
  await ContactListMember.destroy({ where: { listId, contactId } });
  await refreshContactCount(listId);
  await recordAudit({ userId: user.id, action: `Removed a contact from list "${list.name}"`, module: "lists", resourceType: "ContactList", resourceId: listId, departmentId: list.departmentId });
}

export async function getListsForContact(user, contactId) {
  requirePermission(user, "lists.view");
  const memberships = await ContactListMember.findAll({
    where: { contactId },
    include: [{ model: ContactList, attributes: ["id", "name", "folderId"] }],
  });
  return memberships.map((m) => m.ContactList).filter(Boolean);
}

/**
 * The full Company -> Folder -> List hierarchy for one company, with
 * counts - powers the Company detail page's Folders & Lists tab.
 */
export async function getCompanyHierarchy(user, companyId) {
  requirePermission(user, "lists.view");
  const folders = await ListFolder.findAll({
    where: { companyId },
    include: [{ model: ContactList, as: "lists", attributes: ["id", "name", "contactCount"] }],
    order: [["name", "ASC"]],
  });
  return folders;
}
