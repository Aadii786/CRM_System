import "server-only";
import { Op } from "sequelize";
import db from "@/lib/db";

const { Department } = db;

export async function listDepartments() {
  return Department.findAll({ order: [["id", "ASC"]] });
}

export async function departmentByKey(key) {
  return Department.findOne({ where: { key } });
}

/** Resolves department keys (e.g. ["marketing", "ikl-hsm"]) to numeric ids. */
export async function departmentIdsForKeys(keys = []) {
  if (!keys.length) return [];
  const rows = await Department.findAll({ where: { key: { [Op.in]: keys } }, attributes: ["id"] });
  return rows.map((r) => r.id);
}
