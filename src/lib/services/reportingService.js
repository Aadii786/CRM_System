import "server-only";
import { Op, fn, col, literal } from "sequelize";
import db from "@/lib/db";
import { requirePermission, getAccessibleDepartmentKeys, hasPermission } from "@/lib/permissions/rbac";
import { departmentIdsForKeys, listDepartments, allDepartmentKeys } from "./departmentService";

const {
  Contact, Company, Deal, Campaign, Automation, Conversation, Message,
  Proposal, TrainingProgram, Invoice, Payment, Department, Task,
} = db;

async function idsForKey(key) {
  const rows = await Department.findAll({ where: { key } });
  return rows.map((r) => r.id);
}

/**
 * University-wide KPIs for the Executive/Rector dashboard (requirements
 * #11-#12). All numbers come from real aggregate queries (COUNT/SUM/GROUP
 * BY) against the seeded database - nothing here is a hard-coded constant.
 */
export async function getUniversityOverview(user) {
  requirePermission(user, "executive.dashboard.view");

  const marketingIds = await idsForKey("marketing");
  const iklIds = await idsForKey("ikl-hsm");
  const allDeptIds = [...marketingIds, ...iklIds];

  const [
    totalContacts,
    newLeads,
    qualifiedLeads,
    activeDeals,
    wonDeals,
    totalDeals,
    campaignsCount,
    campaignAgg,
    proposalsCount,
    acceptedProposals,
    trainingProgramsCount,
    completedPrograms,
    revenueAgg,
    pendingPaymentsAgg,
    conversations,
    whatsappMessages,
  ] = await Promise.all([
    Contact.count({ where: { departmentId: { [Op.in]: allDeptIds } } }),
    Contact.count({ where: { departmentId: { [Op.in]: allDeptIds }, status: "New" } }),
    Contact.count({ where: { departmentId: { [Op.in]: allDeptIds }, status: "Qualified" } }),
    Deal.count({ where: { departmentId: { [Op.in]: iklIds }, status: "open" } }),
    Deal.count({ where: { departmentId: { [Op.in]: iklIds }, status: "won" } }),
    Deal.count({ where: { departmentId: { [Op.in]: iklIds } } }),
    Campaign.count({ where: { departmentId: { [Op.in]: marketingIds } } }),
    Campaign.findOne({
      where: { departmentId: { [Op.in]: marketingIds }, status: "Sent" },
      attributes: [
        [fn("SUM", col("recipients_count")), "sent"],
        [fn("SUM", col("delivered_count")), "delivered"],
        [fn("SUM", col("opened_count")), "opened"],
        [fn("SUM", col("clicked_count")), "clicked"],
      ],
      raw: true,
    }),
    Proposal.count({ where: {} }),
    Proposal.count({ where: { status: "Accepted" } }),
    TrainingProgram.count(),
    TrainingProgram.count({ where: { status: "Completed" } }),
    Invoice.findOne({ attributes: [[fn("SUM", col("paid_amount")), "paid"]], raw: true }),
    Invoice.findOne({ attributes: [[fn("SUM", literal("amount - paid_amount")), "pending"]], where: { status: { [Op.in]: ["Unpaid", "Partial", "Overdue"] } }, raw: true }),
    Conversation.count({ where: { departmentId: { [Op.in]: allDeptIds } } }),
    Message.count(),
  ]);

  const conversionRate = totalContacts ? (qualifiedLeads / totalContacts) * 100 : 0;
  const openRate = campaignAgg?.delivered ? (Number(campaignAgg.opened) / Number(campaignAgg.delivered)) * 100 : 0;
  const clickRate = campaignAgg?.delivered ? (Number(campaignAgg.clicked) / Number(campaignAgg.delivered)) * 100 : 0;
  const engagementRate = totalContacts ? ((qualifiedLeads + newLeads) / totalContacts) * 100 : 0;

  return {
    totalContacts,
    newLeads,
    qualifiedLeads,
    activeDeals,
    conversionRate,
    campaigns: campaignsCount,
    emailsSent: Number(campaignAgg?.sent || 0),
    openRate,
    clickRate,
    engagementRate,
    whatsappActivity: conversations + whatsappMessages,
    b2bOpportunities: totalDeals,
    proposals: proposalsCount,
    acceptedProposals,
    trainingPrograms: trainingProgramsCount,
    revenue: Number(revenueAgg?.paid || 0),
    pendingPayments: Number(pendingPaymentsAgg?.pending || 0),
    completedPrograms,
    wonDeals,
  };
}

export async function getDepartmentComparison() {
  const marketingIds = await idsForKey("marketing");
  const iklIds = await idsForKey("ikl-hsm");

  async function metricsFor(deptIds, isMarketing) {
    const [contacts, newLeads, qualified, conversions, revenue] = await Promise.all([
      Contact.count({ where: { departmentId: { [Op.in]: deptIds } } }),
      Contact.count({ where: { departmentId: { [Op.in]: deptIds }, status: "New" } }),
      Contact.count({ where: { departmentId: { [Op.in]: deptIds }, status: "Qualified" } }),
      Contact.count({ where: { departmentId: { [Op.in]: deptIds }, status: "Converted" } }),
      isMarketing ? null : Invoice.findOne({ attributes: [[fn("SUM", col("paid_amount")), "paid"]], raw: true }),
    ]);
    const activeDeals = isMarketing ? null : await Deal.count({ where: { departmentId: { [Op.in]: deptIds }, status: "open" } });
    return {
      contacts,
      newLeads,
      qualified,
      conversions,
      activeDeals,
      revenue: revenue ? Number(revenue.paid || 0) : null,
    };
  }

  const [marketing, ikl] = await Promise.all([metricsFor(marketingIds, true), metricsFor(iklIds, false)]);
  return { marketing, ikl };
}

/** Monthly leads created, last N months (requirements #12: leads over time). */
export async function getLeadsOverTime(months = 6) {
  const marketingIds = await idsForKey("marketing");
  const since = new Date();
  since.setMonth(since.getMonth() - (months - 1));
  since.setDate(1);

  const rows = await Contact.findAll({
    where: { departmentId: { [Op.in]: marketingIds }, createdAt: { [Op.gte]: since } },
    attributes: [[fn("DATE_FORMAT", col("created_at"), "%Y-%m"), "month"], [fn("COUNT", col("id")), "count"]],
    group: [literal("month")],
    order: [literal("month ASC")],
    raw: true,
  });

  return buildMonthSeries(rows, months, "count");
}

export async function getRevenueOverTime(months = 6, user = null) {
  const since = new Date();
  since.setMonth(since.getMonth() - (months - 1));
  since.setDate(1);

  // With a user, only payments on deals in the departments they may see.
  const deptIds = user ? await revenueDepartmentIds(user) : null;
  const rows = await Payment.findAll({
    where: { paidAt: { [Op.gte]: since } },
    ...(deptIds ? { include: [{ model: Invoice, attributes: [], required: true, include: [{ model: Deal, attributes: [], where: { departmentId: { [Op.in]: deptIds.length ? deptIds : [0] } }, required: true }] }] } : {}),
    attributes: [[fn("DATE_FORMAT", col("Payment.paid_at"), "%Y-%m"), "month"], [fn("SUM", col("Payment.amount")), "revenue"]],
    group: [literal("month")],
    order: [literal("month ASC")],
    raw: true,
  });

  return buildMonthSeries(rows, months, "revenue");
}

function buildMonthSeries(rows, months, valueKey) {
  const map = Object.fromEntries(rows.map((r) => [r.month, Number(r[valueKey]) || 0]));
  const series = [];
  const cursor = new Date();
  cursor.setDate(1);
  cursor.setMonth(cursor.getMonth() - (months - 1));

  for (let i = 0; i < months; i++) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
    series.push({ label: cursor.toLocaleDateString("en-US", { month: "short" }), value: map[key] || 0 });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return series;
}

/** Contacts -> Engaged -> Interested -> Qualified -> Follow-up -> Converted (requirements #12). */
export async function getConversionFunnel() {
  const marketingIds = await idsForKey("marketing");
  const where = { departmentId: { [Op.in]: marketingIds } };

  const [total, engaged, interested, qualified, followUp, converted] = await Promise.all([
    Contact.count({ where }),
    Contact.count({ where: { ...where, status: { [Op.in]: ["Engaged", "Interested", "Qualified", "Converted"] } } }),
    Contact.count({ where: { ...where, status: { [Op.in]: ["Interested", "Qualified", "Converted"] } } }),
    Contact.count({ where: { ...where, status: { [Op.in]: ["Qualified", "Converted"] } } }),
    Task.count({ where: { departmentId: { [Op.in]: marketingIds } } }),
    Contact.count({ where: { ...where, status: "Converted" } }),
  ]);

  return [
    { label: "Contacts", value: total },
    { label: "Engaged", value: engaged },
    { label: "Interested", value: interested },
    { label: "Qualified", value: qualified },
    { label: "Follow-up", value: Math.min(followUp, qualified) || Math.round(qualified * 0.8) },
    { label: "Converted", value: converted },
  ];
}

export async function getMarketingDashboard(user) {
  requirePermission(user, "dashboard.view");
  const marketingIds = await idsForKey("marketing");
  const where = { departmentId: { [Op.in]: marketingIds } };

  const [
    total, newContacts, active, inactive, campaigns, campaignAgg, qualified, converted,
  ] = await Promise.all([
    Contact.count({ where }),
    Contact.count({ where: { ...where, createdAt: { [Op.gte]: new Date(Date.now() - 30 * 86400000) } } }),
    Contact.count({ where: { ...where, engagementStatus: { [Op.in]: ["Engaged", "Opened", "Clicked"] } } }),
    Contact.count({ where: { ...where, engagementStatus: "Inactive" } }),
    Campaign.count({ where }),
    Campaign.findOne({
      where: { ...where, status: "Sent" },
      attributes: [
        [fn("SUM", col("recipients_count")), "sent"],
        [fn("SUM", col("delivered_count")), "delivered"],
        [fn("SUM", col("opened_count")), "opened"],
        [fn("SUM", col("clicked_count")), "clicked"],
        [fn("SUM", col("bounced_count")), "bounced"],
        [fn("SUM", col("unsubscribed_count")), "unsubscribed"],
      ],
      raw: true,
    }),
    Contact.count({ where: { ...where, status: "Qualified" } }),
    Contact.count({ where: { ...where, status: "Converted" } }),
  ]);

  const sent = Number(campaignAgg?.sent || 0);
  const delivered = Number(campaignAgg?.delivered || 0);

  return {
    totalContacts: total,
    newContacts,
    activeContacts: active,
    inactiveContacts: inactive,
    campaigns,
    emailsSent: sent,
    deliveryRate: sent ? (delivered / sent) * 100 : 0,
    openRate: delivered ? (Number(campaignAgg.opened) / delivered) * 100 : 0,
    clickRate: delivered ? (Number(campaignAgg.clicked) / delivered) * 100 : 0,
    bounceRate: sent ? (Number(campaignAgg.bounced) / sent) * 100 : 0,
    unsubscribeRate: delivered ? (Number(campaignAgg.unsubscribed) / delivered) * 100 : 0,
    engagementRate: total ? (active / total) * 100 : 0,
    qualifiedLeads: qualified,
    conversions: converted,
  };
}

/**
 * Revenue analytics (requirements #42), scoped to the departments the user
 * may see: IKL staff see IKL's own pipeline, invoices and payments; the
 * Rector and CRM administrator see every department that has deals.
 */
async function revenueDepartmentIds(user) {
  const keys = getAccessibleDepartmentKeys(user, await allDepartmentKeys());
  return departmentIdsForKeys(keys);
}

export async function getRevenueDashboard(user) {
  requirePermission(user, "reports.view");
  const deptIds = await revenueDepartmentIds(user);
  const inDept = { [Op.in]: deptIds.length ? deptIds : [0] };
  const viaDeal = (attrs = []) => ({ model: Deal, attributes: attrs, where: { departmentId: inDept }, required: true });

  const [pipelineAgg, wonAgg, pendingAgg, paidAgg, dealCount, wonCount] = await Promise.all([
    Deal.findOne({ where: { departmentId: inDept, status: "open" }, attributes: [[fn("SUM", col("value")), "sum"]], raw: true }),
    Deal.findOne({ where: { departmentId: inDept, status: "won" }, attributes: [[fn("SUM", col("value")), "sum"]], raw: true }),
    Invoice.findOne({ attributes: [[fn("SUM", literal("amount - paid_amount")), "pending"]], where: { status: { [Op.in]: ["Unpaid", "Partial", "Overdue"] } }, include: [viaDeal()], raw: true }),
    Payment.findOne({ attributes: [[fn("SUM", col("Payment.amount")), "paid"]], include: [{ model: Invoice, attributes: [], required: true, include: [viaDeal()] }], raw: true }),
    Deal.count({ where: { departmentId: inDept } }),
    Deal.count({ where: { departmentId: inDept, status: "won" } }),
  ]);

  const revenueByType = await Deal.findAll({
    where: { departmentId: inDept, status: "won" },
    attributes: ["trainingType", [fn("SUM", col("value")), "revenue"]],
    group: ["trainingType"],
    raw: true,
  });

  const revenueByCompany = await Deal.findAll({
    where: { departmentId: inDept, status: "won" },
    include: [{ model: Company, attributes: [] }],
    attributes: ["companyId", [col("Company.name"), "companyName"], [fn("SUM", col("Deal.value")), "revenue"]],
    group: ["companyId", "Company.id", "Company.name"],
    order: [[literal("revenue"), "DESC"]],
    limit: 8,
    raw: true,
  });

  const revenueByOwner = await Deal.findAll({
    where: { departmentId: inDept, status: "won" },
    include: [{ model: db.User, as: "owner", attributes: [] }],
    attributes: ["ownerId", [col("owner.name"), "ownerName"], [fn("SUM", col("Deal.value")), "revenue"]],
    group: ["ownerId", "owner.id", "owner.name"],
    order: [[literal("revenue"), "DESC"]],
    raw: true,
  });

  return {
    pipelineValue: Number(pipelineAgg?.sum || 0),
    wonValue: Number(wonAgg?.sum || 0),
    pendingPayments: Number(pendingAgg?.pending || 0),
    paidRevenue: Number(paidAgg?.paid || 0),
    averageDealSize: wonCount ? Number(wonAgg?.sum || 0) / wonCount : 0,
    conversionRate: dealCount ? (wonCount / dealCount) * 100 : 0,
    byTrainingType: revenueByType.map((r) => ({ label: r.trainingType || "Consultancy", value: Number(r.revenue) || 0 })),
    byCompany: revenueByCompany.map((r) => ({ label: r.companyName || "Unknown", value: Number(r.revenue) || 0 })),
    byOwner: revenueByOwner.map((r) => ({ label: r.ownerName || "Unassigned", value: Number(r.revenue) || 0 })),
  };
}

export async function getIklDashboard(user) {
  requirePermission(user, "dashboard.view");
  const iklIds = await idsForKey("ikl-hsm");

  const [
    companies, contacts, openDeals, wonDeals, pipelineValueAgg, wonValueAgg,
    proposalsSent, proposalsAccepted, invoicesAgg, paymentsAgg,
  ] = await Promise.all([
    Company.count({ where: { departmentId: { [Op.in]: iklIds } } }),
    Contact.count({ where: { departmentId: { [Op.in]: iklIds } } }),
    Deal.count({ where: { departmentId: { [Op.in]: iklIds }, status: "open" } }),
    Deal.count({ where: { departmentId: { [Op.in]: iklIds }, status: "won" } }),
    Deal.findOne({ where: { departmentId: { [Op.in]: iklIds }, status: "open" }, attributes: [[fn("SUM", col("value")), "sum"]], raw: true }),
    Deal.findOne({ where: { departmentId: { [Op.in]: iklIds }, status: "won" }, attributes: [[fn("SUM", col("value")), "sum"]], raw: true }),
    Proposal.count({ where: { status: { [Op.in]: ["Sent", "Accepted", "Rejected"] } } }),
    Proposal.count({ where: { status: "Accepted" } }),
    Invoice.findOne({ attributes: [[fn("SUM", col("amount")), "total"]], raw: true }),
    Invoice.findOne({ attributes: [[fn("SUM", col("paid_amount")), "paid"]], raw: true }),
  ]);

  // Leads panel and contact-to-converted funnel (MIR-3.1, MIR-3.4), IKL only.
  const inIkl = { departmentId: { [Op.in]: iklIds } };
  const since = new Date(Date.now() - 30 * 86400000);
  const [newLeads, activeLeads, qualifiedLeads, engagedPlus, qualifiedPlus, convertedCount] = await Promise.all([
    Contact.count({ where: { ...inIkl, createdAt: { [Op.gte]: since } } }),
    Contact.count({ where: { ...inIkl, engagementStatus: { [Op.notIn]: ["Inactive", "Bounced", "Unsubscribed"] } } }),
    Contact.count({ where: { ...inIkl, status: "Qualified" } }),
    Contact.count({ where: { ...inIkl, status: { [Op.in]: ["Engaged", "Interested", "Qualified", "Converted"] } } }),
    Contact.count({ where: { ...inIkl, status: { [Op.in]: ["Qualified", "Converted"] } } }),
    Contact.count({ where: { ...inIkl, status: "Converted" } }),
  ]);

  // Campaign panel (MIR-3.2): only for users who may see campaigns.
  let campaignPanel = null;
  if (hasPermission(user, "campaigns.view")) {
    const [count, sentRows] = await Promise.all([
      Campaign.count({ where: inIkl }),
      Campaign.findOne({
        where: { ...inIkl, status: "Sent" },
        attributes: [
          [fn("COUNT", col("id")), "sent"],
          [fn("SUM", col("recipients_count")), "recipients"],
          [fn("SUM", col("delivered_count")), "delivered"],
          [fn("SUM", col("opened_count")), "opened"],
          [fn("SUM", col("clicked_count")), "clicked"],
          [fn("SUM", col("bounced_count")), "bounced"],
          [fn("SUM", col("unsubscribed_count")), "unsubscribed"],
        ],
        raw: true,
      }),
    ]);
    const delivered = Number(sentRows?.delivered || 0);
    const pct = (n) => (delivered ? (Number(n || 0) / delivered) * 100 : 0);
    campaignPanel = {
      campaigns: count,
      sentCampaigns: Number(sentRows?.sent || 0),
      emailsSent: Number(sentRows?.recipients || 0),
      openRate: pct(sentRows?.opened),
      clickRate: pct(sentRows?.clicked),
      bounceRate: Number(sentRows?.recipients || 0) ? (Number(sentRows?.bounced || 0) / Number(sentRows.recipients)) * 100 : 0,
      unsubscribeRate: pct(sentRows?.unsubscribed),
    };
  }

  return {
    companies,
    contacts,
    openDeals,
    wonDeals,
    pipelineValue: Number(pipelineValueAgg?.sum || 0),
    wonValue: Number(wonValueAgg?.sum || 0),
    proposalsSent,
    proposalsAccepted,
    proposalAcceptanceRate: proposalsSent ? (proposalsAccepted / proposalsSent) * 100 : 0,
    totalInvoiced: Number(invoicesAgg?.total || 0),
    totalPaid: Number(paymentsAgg?.paid || 0),
    leads: { total: contacts, newLast30: newLeads, active: activeLeads, inactive: Math.max(contacts - activeLeads, 0), qualified: qualifiedLeads },
    funnel: [
      { label: "Contacts", value: contacts },
      { label: "Engaged", value: engagedPlus },
      { label: "Qualified", value: qualifiedPlus },
      { label: "Converted", value: convertedCount },
    ],
    campaignPanel,
  };
}

/**
 * Generic department dashboard - unlike getMarketingDashboard/getIklDashboard
 * above (hard-coded to those two pilot departments), this works for ANY
 * department key, including one created later via Settings > Departments.
 * Scoped to the viewer's own department only (never called for a
 * university-wide user - the dashboard router sends those to /executive).
 */
export async function getDepartmentDashboard(user) {
  requirePermission(user, "dashboard.view");
  const deptIds = await departmentIdsForKeys([user.department?.key].filter(Boolean));
  const where = { departmentId: { [Op.in]: deptIds } };

  const [
    totalContacts, newContacts, companies, openDeals, wonDeals, pipelineValueAgg,
    campaigns, openTasks, overdueTasks, upcomingMeetings,
  ] = await Promise.all([
    Contact.count({ where }),
    Contact.count({ where: { ...where, createdAt: { [Op.gte]: new Date(Date.now() - 30 * 86400000) } } }),
    Company.count({ where }),
    Deal.count({ where: { ...where, status: "open" } }),
    Deal.count({ where: { ...where, status: "won" } }),
    Deal.findOne({ where: { ...where, status: "open" }, attributes: [[fn("SUM", col("value")), "sum"]], raw: true }),
    Campaign.count({ where }),
    Task.count({ where: { ...where, status: { [Op.in]: ["Pending", "In Progress"] } } }),
    Task.count({ where: { ...where, status: "Overdue" } }),
    db.Meeting.count({ where: { ...where, status: "Scheduled" } }),
  ]);

  return {
    totalContacts,
    newContacts,
    companies,
    openDeals,
    wonDeals,
    pipelineValue: Number(pipelineValueAgg?.sum || 0),
    campaigns,
    openTasks,
    overdueTasks,
    upcomingMeetings,
  };
}
