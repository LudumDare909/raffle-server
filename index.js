const express = require("express");
const cors = require("cors");
const fs = require("fs-extra");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_PATH = "./data/raffles.json";

// ----------------------------
// Middleware
// ----------------------------
app.use(cors());
app.use(express.json());

// ----------------------------
// Утилита: загрузка данных
// ----------------------------
async function loadData() {
  if (!(await fs.pathExists(DATA_PATH))) {
    await fs.outputJson(DATA_PATH, { raffles: [] }, { spaces: 2 });
  }
  return fs.readJson(DATA_PATH);
}

// ----------------------------
// GET /raffles
// Получить все розыгрыши
// ----------------------------
app.get("/raffles", async (req, res) => {
  const data = await loadData();
  res.json(data.raffles);
});

// ----------------------------
// GET /raffle/:id
// Получить один розыгрыш
// ----------------------------
app.get("/raffle/:id", async (req, res) => {
  const data = await loadData();
  const raffle = data.raffles.find(r => r.raffleId === req.params.id);

  if (!raffle) {
    return res.status(404).json({ error: "raffle not found" });
  }

  res.json(raffle);
});

// ----------------------------
// POST /raffle/create
// Создать новый розыгрыш
// ----------------------------
app.post("/raffle/create", async (req, res) => {
  const { raffleId, title } = req.body;

  if (!raffleId) {
    return res.status(400).json({ error: "raffleId is required" });
  }

  const data = await loadData();

  const exists = data.raffles.find(r => r.raffleId === raffleId);
  if (exists) {
    return res.status(400).json({ error: "raffle already exists" });
  }

  const newRaffle = {
    raffleId,
    title: title || "",
    participants: []
  };

  data.raffles.push(newRaffle);
  await fs.writeJson(DATA_PATH, data, { spaces: 2 });

  res.json({
    status: "created",
    raffle: newRaffle
  });
});

// ----------------------------
// POST /raffle/join
// Отправить участие
// ----------------------------
app.post("/raffle/join", async (req, res) => {
  const { raffleId, playerId } = req.body;

  if (!raffleId || !playerId) {
    return res.status(400).json({ error: "invalid data" });
  }

  const data = await loadData();
  const raffle = data.raffles.find(r => r.raffleId === raffleId);

  if (!raffle) {
    return res.status(404).json({ error: "raffle not found" });
  }

  if (raffle.participants.includes(playerId)) {
    return res.json({ status: "already_joined" });
  }

  raffle.participants.push(playerId);
  await fs.writeJson(DATA_PATH, data, { spaces: 2 });

  res.json({
    status: "joined",
    total: raffle.participants.length
  });
});

// ----------------------------
// Корень (не обязательно, но удобно)
// ----------------------------
app.get("/", (req, res) => {
  res.send("Raffle server is running");
});

// ----------------------------
// Запуск сервера
// ----------------------------
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});