const express = require("express");
const cors = require("cors");
const fs = require("fs-extra");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || "super_secret_key";

const DATA_PATH = path.join(__dirname, "data", "raffles.json");

app.use(cors());
app.use(express.json());

// ======================= UTILS =======================
async function loadData() {
  if (!(await fs.pathExists(DATA_PATH))) {
    await fs.outputJson(DATA_PATH, { raffles: [] }, { spaces: 2 });
  }
  return fs.readJson(DATA_PATH);
}

async function saveData(data) {
  await fs.writeJson(DATA_PATH, data, { spaces: 2 });
}

function checkAdminKey(req, res, next) {
  if (req.header("X-ADMIN-KEY") !== ADMIN_KEY) {
    return res.status(403).json({ error: "Invalid ADMIN_KEY" });
  }
  next();
}

// ======================= ROUTES =======================

// ✔️ Unity-friendly ответ
app.get("/raffles", async (_, res) => {
  const data = await loadData();
  res.json({ raffles: data.raffles });
});

app.post("/raffle/join", async (req, res) => {
  const { raffleId, nickname, email } = req.body;

  if (!raffleId || !nickname || !email)
    return res.status(400).json({ error: "Invalid data" });

  const data = await loadData();
  const raffle = data.raffles.find(r => r.id === raffleId);

  if (!raffle) return res.status(404).json({ error: "Not found" });

  if (raffle.participants.some(p => p.email === email))
    return res.json({ status: "already_joined" });

  raffle.participants.push({ nickname, email });
  await saveData(data);

  res.json({ status: "joined", total: raffle.participants.length });
});

app.post("/raffle/create", checkAdminKey, async (req, res) => {
  const data = await loadData();
  data.raffles.push({
    ...req.body,
    participants: [],
    winner: ""
  });

  await saveData(data);
  res.json({ status: "created" });
});

app.get("/", (_, res) => {
  res.send("Raffle server running");
});

app.listen(PORT, () => {
  console.log("Server started on port", PORT);
});