const express = require("express");
const cors = require("cors");
const fs = require("fs-extra");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_PATH = "./data/raffles.json";

// Разрешаем запросы из браузера (WebGL)
app.use(cors());

// Говорим серверу: принимаем JSON
app.use(express.json());

/*
  GET /raffles
  Получить все розыгрыши
*/
app.get("/raffles", async (req, res) => {
  const data = await fs.readJson(DATA_PATH);
  res.json(data.raffles);
});

/*
  GET /raffle/:id
  Получить один розыгрыш
*/
app.get("/raffle/:id", async (req, res) => {
  const data = await fs.readJson(DATA_PATH);
  const raffle = data.raffles.find(r => r.raffleId === req.params.id);

  if (!raffle) {
    return res.status(404).json({ error: "raffle not found" });
  }

  res.json(raffle);
});

/*
  POST /raffle/join
  Отправить участие
*/
app.post("/raffle/join", async (req, res) => {
  const { raffleId, playerId } = req.body;

  if (!raffleId || !playerId) {
    return res.status(400).json({ error: "invalid data" });
  }

  const data = await fs.readJson(DATA_PATH);
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

// Запуск сервера
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});