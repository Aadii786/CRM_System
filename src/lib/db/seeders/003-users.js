"use strict";

const bcrypt = require("bcryptjs");
const { DEMO_USERS } = require("../../constants/demoUsers");
const { idMapByColumn } = require("./lib/lookup");

module.exports = {
  async up(queryInterface) {
    require("dotenv").config({ path: ".env.local" });
    require("dotenv").config();

    const now = new Date();
    const departmentIds = await idMapByColumn(queryInterface, "departments", "key");
    const roleIds = await idMapByColumn(queryInterface, "roles", "key");

    const demoPassword = process.env.DEMO_USER_PASSWORD || "Demo@12345";
    const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || "admin@university.edu.pk";
    const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || "Admin@12345";
    const salt = await bcrypt.genSalt(10);

    const userRows = [];
    for (const u of DEMO_USERS) {
      // The seeded Central Administrator doubles as DEFAULT_ADMIN_EMAIL when
      // they match; otherwise both accounts are created independently.
      const isDefaultAdmin = u.roleKey === "CENTRAL_CRM_ADMINISTRATOR";
      const email = isDefaultAdmin && adminEmail ? adminEmail : u.email;
      const password = isDefaultAdmin ? adminPassword : demoPassword;
      userRows.push({
        __roleKey: u.roleKey,
        name: u.name,
        email,
        password_hash: await bcrypt.hash(password, salt),
        job_title: u.jobTitle,
        avatar_color: u.avatarColor,
        primary_role_key: u.roleKey,
        department_id: departmentIds[u.departmentKey],
        status: "active",
        last_active_at: now,
        created_at: now,
        updated_at: now,
      });
    }

    await queryInterface.bulkInsert(
      "users",
      userRows.map(({ __roleKey, ...row }) => row),
      {}
    );

    const userIds = await idMapByColumn(queryInterface, "users", "email");
    const userRoleRows = userRows.map((u) => ({
      user_id: userIds[u.email],
      role_id: roleIds[u.__roleKey],
      created_at: now,
      updated_at: now,
    }));
    await queryInterface.bulkInsert("user_roles", userRoleRows, {});
  },
  async down(queryInterface) {
    await queryInterface.bulkDelete("user_roles", null, {});
    await queryInterface.bulkDelete("users", null, {});
  },
};
