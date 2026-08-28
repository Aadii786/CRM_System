"use strict";

// Model loader (CommonJS - used by sequelize-cli and required by our own
// runtime connection.js). Model files are required statically by name
// rather than via fs.readdirSync()+dynamic require(): Turbopack (Next.js
// 16's default bundler, used for both `next dev` and `next build`) cannot
// resolve fully dynamic require() calls, so every new model must be added
// to this list explicitly.
const { Sequelize, DataTypes } = require("sequelize");

const env = process.env.NODE_ENV || "development";
const config = require("../config/config.js")[env];

const sequelize = new Sequelize(config.database, config.username, config.password, config);

const modelDefiners = [
  require("./department.model.js"),
  require("./permission.model.js"),
  require("./role.model.js"),
  require("./rolePermission.model.js"),
  require("./userRole.model.js"),
  require("./user.model.js"),
  require("./auditLog.model.js"),
  require("./tag.model.js"),
  require("./contactTag.model.js"),
  require("./contact.model.js"),
  require("./activity.model.js"),
  require("./company.model.js"),
  require("./pipeline.model.js"),
  require("./pipelineStage.model.js"),
  require("./deal.model.js"),
  require("./task.model.js"),
  require("./meeting.model.js"),
  require("./note.model.js"),
  require("./segment.model.js"),
  require("./segmentCondition.model.js"),
  require("./campaign.model.js"),
  require("./campaignRecipient.model.js"),
  require("./campaignEvent.model.js"),
  require("./automation.model.js"),
  require("./automationNode.model.js"),
  require("./automationExecution.model.js"),
  require("./automationExecutionLog.model.js"),
  require("./conversation.model.js"),
  require("./message.model.js"),
  require("./trainer.model.js"),
  require("./trainingProgram.model.js"),
  require("./tna.model.js"),
  require("./proposal.model.js"),
  require("./participant.model.js"),
  require("./invoice.model.js"),
  require("./payment.model.js"),
  require("./trainerRemuneration.model.js"),
  require("./notification.model.js"),
  require("./integration.model.js"),
  require("./webhook.model.js"),
  require("./apiKey.model.js"),
  require("./import.model.js"),
  require("./importRow.model.js"),
  require("./customField.model.js"),
  require("./customObject.model.js"),
  require("./customObjectRecord.model.js"),
  require("./setting.model.js"),
];

const db = {};
for (const definer of modelDefiners) {
  const model = definer(sequelize, DataTypes);
  db[model.name] = model;
}

Object.keys(db).forEach((modelName) => {
  if (typeof db[modelName].associate === "function") {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
