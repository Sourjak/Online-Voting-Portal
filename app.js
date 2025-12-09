require("dotenv").config();
const express = require("express");
const session = require("express-session");
const path = require("path");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");
const db = require("./db");

const app = express();

// ---- Config & Secrets ----
const SESSION_SECRET = process.env.SESSION_SECRET || "dev_session_secret_change_me";
const ENCRYPTION_KEY_HEX = process.env.ENCRYPTION_KEY; // 64 hex chars for 32 bytes
const PUBLIC_SALT = process.env.PUBLIC_SALT || "public_salt_for_receipts";

if (!ENCRYPTION_KEY_HEX || ENCRYPTION_KEY_HEX.length !== 64) {
  console.error("ERROR: Set ENCRYPTION_KEY in .env to a 64-hex-character (32-byte) key.");
  process.exit(1);
}
const KEY = Buffer.from(ENCRYPTION_KEY_HEX, "hex");

// ---- Helpers ----
function encryptBallot(plaintext) {
  const nonce = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, nonce);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    cipher_hex: enc.toString("hex"),
    nonce_hex: nonce.toString("hex"),
    tag_hex: tag.toString("hex"),
  };
}
function makeReceiptHash(voteId, cipherHex) {
  const h = crypto.createHash("sha256");
  h.update(voteId + "|" + cipherHex + "|" + PUBLIC_SALT);
  return h.digest("hex");
}

// ---- Middleware ----
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");

app.use(
  session({
    name: "ovote.sid",
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: "lax" },
  })
);

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

function ensureAuth(req, res, next) {
  if (!req.session.user) return res.redirect("/login");
  next();
}

function ensureAdmin(req, res, next) {
  if (!req.session.user || !req.session.user.is_admin) return res.status(403).send("Forbidden");
  next();
}

// ---- Seed default admin if missing ----
(async () => {
  const count = await db.users.count({});
  if (count === 0) {
    const pwHash = bcrypt.hashSync("admin123", 10);
    await db.users.insert({ username: "admin", password_hash: pwHash, is_admin: 1 });
    console.log("Default admin created: username=admin password=admin123");
  }
})();

// ---- Routes ----
app.get("/", async (req, res) => {
  if (!req.session.user) return res.redirect("/login");
  const openElections = await db.elections.find({ is_open: true }).sort({ _id: -1 });
  res.render("dashboard", { openElections });
});

// Auth
app.get("/register", (req, res) => res.render("register", { error: null }));
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.render("register", { error: "Username and password required." });
  try {
    const hash = bcrypt.hashSync(password, 10);
    const doc = await db.users.insert({ username, password_hash: hash, is_admin: 0 });
    req.session.user = { id: doc._id, username: doc.username, is_admin: 0 };
    res.redirect("/");
  } catch (e) {
    if (String(e).includes("unique")) return res.render("register", { error: "Username already taken." });
    return res.render("register", { error: "Registration failed." });
  }
});

app.get("/login", (req, res) => res.render("login", { error: null }));
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const u = await db.users.findOne({ username });
  if (!u) return res.render("login", { error: "Invalid credentials." });
  if (!bcrypt.compareSync(password, u.password_hash)) return res.render("login", { error: "Invalid credentials." });
  req.session.user = { id: u._id, username: u.username, is_admin: !!u.is_admin };
  res.redirect("/");
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
});

// Voting
app.get("/vote/:electionId", ensureAuth, async (req, res) => {
  const electionId = req.params.electionId;
  const election = await db.elections.findOne({ _id: electionId });
  if (!election) return res.status(404).send("Election not found.");
  const candidates = await db.candidates.find({ election_id: electionId }).sort({ _id: 1 });
  const already = (await db.votes.count({ election_id: electionId, user_id: req.session.user.id })) > 0;
  res.render("vote", { election, candidates, already });
});

app.post("/vote/:electionId", ensureAuth, async (req, res) => {
  const electionId = req.params.electionId;
  const election = await db.elections.findOne({ _id: electionId });
  if (!election || !election.is_open) return res.status(400).send("Election is closed or not found.");

  const candidateId = req.body.candidate_id;
  if (!candidateId) return res.status(400).send("No candidate selected.");

  // One vote per election (enforced via unique key too)
  const userId = req.session.user.id;
  const unique_election_user = `${electionId}_${userId}`;
  const already = await db.votes.findOne({ unique_election_user });
  if (already) return res.status(400).send("You have already voted in this election.");

  const { cipher_hex, nonce_hex, tag_hex } = encryptBallot(String(candidateId));
  const voteId = uuidv4();
  const createdAt = new Date().toISOString();
  const receipt_hash = makeReceiptHash(voteId, cipher_hex);

  try {
    await db.votes.insert({
      id: voteId,
      election_id: electionId,
      user_id: userId,
      cipher_hex,
      nonce_hex,
      tag_hex,
      created_at: createdAt,
      receipt_hash,
      unique_election_user
    });

    // Tally increment (idempotent upsert)
    const unique_election_candidate = `${electionId}_${candidateId}`;
    const existing = await db.tallies.findOne({ unique_election_candidate });
    if (!existing) {
      await db.tallies.insert({
        election_id: electionId,
        candidate_id: candidateId,
        count: 1,
        unique_election_candidate
      });
    } else {
      await db.tallies.update({ unique_election_candidate }, { $inc: { count: 1 } });
    }

    // store receipt for public list
    await db.receipts.insert({ receipt_hash });

    res.redirect(`/receipt/${voteId}`);
  } catch (e) {
    if (String(e).includes("unique_election_user")) {
      return res.status(400).send("You have already voted in this election.");
    }
    console.error(e);
    return res.status(500).send("Vote failed.");
  }
});

app.get("/receipt/:voteId", ensureAuth, async (req, res) => {
  const row = await db.votes.findOne({ id: req.params.voteId, user_id: req.session.user.id });
  if (!row) return res.status(404).send("Receipt not found.");
  const election = await db.elections.findOne({ _id: row.election_id });
  res.render("receipt", { election, receipt_hash: row.receipt_hash, created_at: row.created_at });
});

// Public receipts
app.get("/public/receipts", async (req, res) => {
  const rows = await db.receipts.find({}).sort({ receipt_hash: 1 });
  res.json(rows.map(r => r.receipt_hash));
});

// Admin (with candidate name join for tallies)
app.get("/admin", ensureAdmin, async (req, res) => {
  const elections = await db.elections.find({}).sort({ _id: -1 });
  const byElection = [];
  for (const e of elections) {
    const candidates = await db.candidates.find({ election_id: e._id }).sort({ _id: 1 });
    const tallies = await db.tallies.find({ election_id: e._id });
    const nameById = new Map(candidates.map(c => [String(c._id), c.name]));
    const talliesWithNames = tallies
      .sort((a,b) => String(a.candidate_id).localeCompare(String(b.candidate_id)))
      .map(t => ({ ...t, name: nameById.get(String(t.candidate_id)) || String(t.candidate_id) }));
    byElection.push({ election: e, candidates, tallies: talliesWithNames });
  }
  res.render("admin", { byElection });
});

app.post("/admin/elections/create", ensureAdmin, async (req, res) => {
  const name = (req.body.name || "").trim();
  if (!name) return res.status(400).send("Election name required.");
  await db.elections.insert({ name, is_open: true });
  res.redirect("/admin");
});

app.post("/admin/elections/:id/toggle", ensureAdmin, async (req, res) => {
  const id = req.params.id;
  const e = await db.elections.findOne({ _id: id });
  if (!e) return res.status(404).send("Election not found.");
  await db.elections.update({ _id: id }, { $set: { is_open: !e.is_open } });
  res.redirect("/admin");
});

app.post("/admin/candidates/add", ensureAdmin, async (req, res) => {
  const electionId = req.body.election_id;
  const name = (req.body.name || "").trim();
  if (!electionId || !name) return res.status(400).send("Election and candidate name required.");
  await db.candidates.insert({ election_id: electionId, name });
  res.redirect("/admin");
});

// ---- Start ----
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Online Voting running at http://localhost:${PORT}`);
});
