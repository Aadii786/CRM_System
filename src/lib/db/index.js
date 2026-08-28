import db from "./models/index.js";

// Single entry point the rest of the app imports from:
//   import db from "@/lib/db";
//   const { Contact, Company } = db;
// `db.sequelize` is the live connection; `db.Sequelize` is the library
// export (Op, DataTypes, etc.) for building raw queries.
export default db;
