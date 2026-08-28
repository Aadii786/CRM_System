"use strict";

const { createRng, pick, intBetween, dateWithinDays } = require("./lib/random");
const { idMapByColumn } = require("./lib/lookup");
const { insertOne } = require("./lib/insertOne");

module.exports = {
  async up(queryInterface) {
    const rng = createRng(333);
    const now = new Date();

    const departmentIds = await idMapByColumn(queryInterface, "departments", "key");
    const userIds = await idMapByColumn(queryInterface, "users", "email");
    const marketingOwners = [userIds["marketing.manager@university.edu.pk"], userIds["marketing.exec@university.edu.pk"]];
    const campaignIds = await idMapByColumn(queryInterface, "campaigns", "name");

    // ---- The mandatory marketing workflow automation (requirements #22-#25) ----
    const automationId = await insertOne(queryInterface, "automations", {
      name: "58k Contact Nurture -> WhatsApp Handoff",
      description: "Send Email #1, branch on engagement, escalate interested contacts to WhatsApp and assign a follow-up task.",
      department_id: departmentIds["marketing"],
      status: "Active",
      trigger_type: "campaign_sent",
      trigger_config: JSON.stringify({ campaignId: campaignIds["Fall Admissions - Email #1: Introducing Our Programs"] || null }),
      created_by: pick(rng, marketingOwners),
      total_entered: 58000,
      total_active: 4120,
      total_completed: 52180,
      total_exited: 1700,
      total_converted: 6840,
      created_at: dateWithinDays(rng, 40),
      updated_at: now,
    });

    const trigger = await insertOne(queryInterface, "automation_nodes", {
      automation_id: automationId, parent_id: null, branch: null,
      type: "trigger", key: "campaign_sent", label: "Trigger: Campaign Sent (Email #1)",
      config: JSON.stringify({ campaign: "Fall Admissions - Email #1" }), order: 0,
      created_at: now, updated_at: now,
    });

    const wait1 = await insertOne(queryInterface, "automation_nodes", {
      automation_id: automationId, parent_id: trigger, branch: null,
      type: "delay", key: "wait", label: "Wait 3 days",
      config: JSON.stringify({ days: 3 }), order: 1,
      created_at: now, updated_at: now,
    });

    const condOpened = await insertOne(queryInterface, "automation_nodes", {
      automation_id: automationId, parent_id: wait1, branch: null,
      type: "condition", key: "email_opened", label: "Condition: Email #1 opened?",
      config: JSON.stringify({}), order: 2,
      created_at: now, updated_at: now,
    });

    // YES branch
    const email2 = await insertOne(queryInterface, "automation_nodes", {
      automation_id: automationId, parent_id: condOpened, branch: "yes",
      type: "action", key: "send_email", label: "Send Email #2",
      config: JSON.stringify({ campaign: "Fall Admissions - Email #2" }), order: 3,
      created_at: now, updated_at: now,
    });
    const wait2 = await insertOne(queryInterface, "automation_nodes", {
      automation_id: automationId, parent_id: email2, branch: null,
      type: "delay", key: "wait", label: "Wait 3 days",
      config: JSON.stringify({ days: 3 }), order: 4,
      created_at: now, updated_at: now,
    });
    const condClicked = await insertOne(queryInterface, "automation_nodes", {
      automation_id: automationId, parent_id: wait2, branch: null,
      type: "condition", key: "email_clicked", label: "Condition: Clicked?",
      config: JSON.stringify({}), order: 5,
      created_at: now, updated_at: now,
    });

    // YES -> interested -> WhatsApp -> assign -> task -> exit converted
    const markInterested = await insertOne(queryInterface, "automation_nodes", {
      automation_id: automationId, parent_id: condClicked, branch: "yes",
      type: "action", key: "update_status", label: "Mark Interested",
      config: JSON.stringify({ status: "Interested" }), order: 6,
      created_at: now, updated_at: now,
    });
    const sendWhatsapp = await insertOne(queryInterface, "automation_nodes", {
      automation_id: automationId, parent_id: markInterested, branch: null,
      type: "action", key: "send_whatsapp", label: "Send WhatsApp Message",
      config: JSON.stringify({ template: "interested_followup" }), order: 7,
      created_at: now, updated_at: now,
    });
    const assign = await insertOne(queryInterface, "automation_nodes", {
      automation_id: automationId, parent_id: sendWhatsapp, branch: null,
      type: "action", key: "assign_user", label: "Assign to Staff",
      config: JSON.stringify({ pool: "marketing" }), order: 8,
      created_at: now, updated_at: now,
    });
    const createTask = await insertOne(queryInterface, "automation_nodes", {
      automation_id: automationId, parent_id: assign, branch: null,
      type: "action", key: "create_task", label: "Create Follow-up Task",
      config: JSON.stringify({ title: "Follow up with interested lead", dueInDays: 1 }), order: 9,
      created_at: now, updated_at: now,
    });
    await insertOne(queryInterface, "automation_nodes", {
      automation_id: automationId, parent_id: createTask, branch: null,
      type: "exit", key: "converted", label: "Exit: Converted",
      config: JSON.stringify({}), order: 10,
      created_at: now, updated_at: now,
    });

    // NO (from clicked) -> Email #3 -> exit nurture complete
    const email3 = await insertOne(queryInterface, "automation_nodes", {
      automation_id: automationId, parent_id: condClicked, branch: "no",
      type: "action", key: "send_email", label: "Send Email #3",
      config: JSON.stringify({ campaign: "Fall Admissions - Email #3" }), order: 11,
      created_at: now, updated_at: now,
    });
    await insertOne(queryInterface, "automation_nodes", {
      automation_id: automationId, parent_id: email3, branch: null,
      type: "exit", key: "nurture_complete", label: "Exit: Nurture Complete",
      config: JSON.stringify({}), order: 12,
      created_at: now, updated_at: now,
    });

    // NO (from opened) -> wait -> retry Email #2 -> exit
    const waitNo = await insertOne(queryInterface, "automation_nodes", {
      automation_id: automationId, parent_id: condOpened, branch: "no",
      type: "delay", key: "wait", label: "Wait 3 days",
      config: JSON.stringify({ days: 3 }), order: 13,
      created_at: now, updated_at: now,
    });
    const retryEmail2 = await insertOne(queryInterface, "automation_nodes", {
      automation_id: automationId, parent_id: waitNo, branch: null,
      type: "action", key: "send_email", label: "Send Email #2 (retry)",
      config: JSON.stringify({ campaign: "Fall Admissions - Email #2" }), order: 14,
      created_at: now, updated_at: now,
    });
    await insertOne(queryInterface, "automation_nodes", {
      automation_id: automationId, parent_id: retryEmail2, branch: null,
      type: "exit", key: "nurture_complete", label: "Exit: Nurture Complete",
      config: JSON.stringify({}), order: 15,
      created_at: now, updated_at: now,
    });

    // A sample of real executions so the automation detail page has real
    // contacts/logs to page through (aggregate totals above cover the KPIs).
    const [sampleContacts] = await queryInterface.sequelize.query(
      `SELECT id FROM contacts WHERE department_id = ${departmentIds["marketing"]} ORDER BY lead_score DESC LIMIT 150`
    );
    const executionRows = sampleContacts.map((c) => {
      const outcome = pick(rng, ["active", "completed", "completed", "exited"]);
      return {
        automation_id: automationId,
        contact_id: c.id,
        status: outcome,
        current_node_id: outcome === "active" ? condOpened : null,
        started_at: dateWithinDays(rng, 30),
        completed_at: outcome !== "active" ? dateWithinDays(rng, 10) : null,
        created_at: now,
      };
    });
    await queryInterface.bulkInsert("automation_executions", executionRows, {});

    // ---- Second, simpler automation: WhatsApp reply -> qualify (requirements #27) ----
    const waAutomationId = await insertOne(queryInterface, "automations", {
      name: "WhatsApp Reply -> Auto-Qualify",
      description: "When a contact replies on WhatsApp, mark them Qualified and notify their owner.",
      department_id: departmentIds["marketing"],
      status: "Active",
      trigger_type: "whatsapp_response",
      trigger_config: JSON.stringify({}),
      created_by: pick(rng, marketingOwners),
      total_entered: 640,
      total_active: 60,
      total_completed: 540,
      total_exited: 40,
      total_converted: 210,
      created_at: dateWithinDays(rng, 25),
      updated_at: now,
    });
    const waTrigger = await insertOne(queryInterface, "automation_nodes", {
      automation_id: waAutomationId, parent_id: null, branch: null,
      type: "trigger", key: "whatsapp_response", label: "Trigger: WhatsApp reply received",
      config: JSON.stringify({}), order: 0, created_at: now, updated_at: now,
    });
    const waMark = await insertOne(queryInterface, "automation_nodes", {
      automation_id: waAutomationId, parent_id: waTrigger, branch: null,
      type: "action", key: "update_status", label: "Mark Qualified",
      config: JSON.stringify({ status: "Qualified" }), order: 1, created_at: now, updated_at: now,
    });
    const waNotify = await insertOne(queryInterface, "automation_nodes", {
      automation_id: waAutomationId, parent_id: waMark, branch: null,
      type: "action", key: "create_notification", label: "Notify Owner",
      config: JSON.stringify({}), order: 2, created_at: now, updated_at: now,
    });
    await insertOne(queryInterface, "automation_nodes", {
      automation_id: waAutomationId, parent_id: waNotify, branch: null,
      type: "exit", key: "qualified", label: "Exit: Qualified",
      config: JSON.stringify({}), order: 3, created_at: now, updated_at: now,
    });
  },
  async down(queryInterface) {
    await queryInterface.bulkDelete("automation_executions", null, {});
    await queryInterface.bulkDelete("automation_nodes", null, {});
    await queryInterface.bulkDelete("automations", null, {});
  },
};
