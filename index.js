const express = require("express");
const cors = require("cors");
const fs = require("fs-extra");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_PATH = "./data/raffles.json";
const ADMIN_KEY = process.env.ADMIN_KEY || "super_secret_key";


app.use(cors());
app.use(express.json());


async function loadData() {
  if (!(await fs.pathExists(DATA_PATH))) {
    await fs.outputJson(DATA_PATH, { raffles: [] }, { spaces: 2 });
  }
  return fs.readJson(DATA_PATH);
}


function checkAdminKey(req, res, next) {
  const key = req.header("X-ADMIN-KEY");
  if (!key || key !== ADMIN_KEY) {
    return res.status(403).json({ error: "Forbidden: invalid ADMIN_KEY" });
  }
  next();
}


app.get("/raffles", async (req, res) => {
  const data = await loadData();
  res.json(data.raffles);
});


app.get("/raffle/:id", async (req, res) => {
  const data = await loadData();
  const raffle = data.raffles.find(r => r.id === parseInt(req.params.id));

  if (!raffle) return res.status(404).json({ error: "raffle not found" });
  res.json(raffle);
});


app.post("/raffle/create", checkAdminKey, async (req, res) => {
  const { id, title, prize, status, dateTime } = req.body;

  if (id == null || !title || prize == null || !status || !dateTime) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const data = await loadData();
  const exists = data.raffles.find(r => r.id === id);
  if (exists) return res.status(400).json({ error: "Raffle already exists" });

  const newRaffle = {
    id,
    title,
    prize,
    status,
    winner: "",
    dateTime,
    participants: []
  };

  data.raffles.push(newRaffle);
  await fs.writeJson(DATA_PATH, data, { spaces: 2 });

  res.json({ status: "created", raffle: newRaffle });
});


app.post("/raffle/join", async (req, res) => {
  const { raffleId, nickname, email } = req.body;

  if (raffleId == null || !nickname || !email) {
    return res.status(400).json({ error: "invalid data" });
  }

  const data = await loadData();
  const raffle = data.raffles.find(r => r.id === raffleId);
  if (!raffle) return res.status(404).json({ error: "raffle not found" });

  // Ïðîâåðêà äóáëèêàòîâ ïî email èëè nickname
  if (raffle.participants.find(p => p.email === email || p.nickname === nickname)) {
    return res.json({ status: "already_joined" });
  }

  raffle.participants.push({ nickname, email });
  await fs.writeJson(DATA_PATH, data, { spaces: 2 });

  res.json({ status: "joined", total: raffle.participants.length });
});


app.post("/raffle/finish/:id", checkAdminKey, async (req, res) => {
  const { winner } = req.body;
  if (!winner) return res.status(400).json({ error: "winner is required" });

  const data = await loadData();
  const raffle = data.raffles.find(r => r.id === parseInt(req.params.id));
  if (!raffle) return res.status(404).json({ error: "raffle not found" });

  raffle.winner = winner;
  raffle.status = "finished";

  await fs.writeJson(DATA_PATH, data, { spaces: 2 });

  res.json({ status: "raffle_finished", raffle });
});


app.delete("/raffle/:id", checkAdminKey, async (req, res) => {
  const data = await loadData();
  const index = data.raffles.findIndex(r => r.id === parseInt(req.params.id));
  if (index === -1) return res.status(404).json({ error: "raffle not found" });

  const removed = data.raffles.splice(index, 1);
  await fs.writeJson(DATA_PATH, data, { spaces: 2 });

  res.json({ status: "deleted", raffle: removed[0] });
});


app.get("/", (req, res) => {
  res.send("Raffle server is running");
});


app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
