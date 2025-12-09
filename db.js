const fs = require("fs");
const path = require("path");
const Datastore = require("nedb-promises");

const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = {
  users: Datastore.create({ filename: path.join(dataDir, "users.db"), autoload: true }),
  elections: Datastore.create({ filename: path.join(dataDir, "elections.db"), autoload: true }),
  candidates: Datastore.create({ filename: path.join(dataDir, "candidates.db"), autoload: true }),
  votes: Datastore.create({ filename: path.join(dataDir, "votes.db"), autoload: true }),
  receipts: Datastore.create({ filename: path.join(dataDir, "receipts.db"), autoload: true }),
  tallies: Datastore.create({ filename: path.join(dataDir, "tallies.db"), autoload: true })
};

// Unique indexes
(async () => {
  try {
    await db.users.ensureIndex({ fieldName: "username", unique: true });
  } catch {}
  try {
    await db.votes.ensureIndex({ fieldName: "id", unique: true }); // vote UUID
  } catch {}
  try {
    await db.votes.ensureIndex({ fieldName: "unique_election_user", unique: true }); // one vote per election per user
  } catch {}
  try {
    await db.receipts.ensureIndex({ fieldName: "receipt_hash", unique: true });
  } catch {}
  try {
    await db.tallies.ensureIndex({ fieldName: "unique_election_candidate", unique: true });
  } catch {}
})();

module.exports = db;
