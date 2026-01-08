const express = require("express");
const cors = require("cors");
const fs = require("fs-extra");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_PATH = "./data/raffles.json";
const ADMIN_KEY = process.env.ADMIN_KEY || "super_secret_key";

app.use(cors());
app.use(express.json());


// ==================================================
// UTILS
// ==================================================
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
  const key = req.header("X-ADMIN-KEY");
  if (!key || key !== ADMIN_KEY) {
    return res.status(403).json({ error: "Forbidden: invalid ADMIN_KEY" });
  }
  next();
}


// ==================================================
// GET ALL RAFFLES
// ==================================================
app.get("/raffles", async (req, res) => {
  try {
    const data = await loadData();
    res.json(data.raffles);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server error" });
  }
});


// ==================================================
// GET RAFFLE BY ID
// ==================================================
app.get("/raffle/:id", async (req, res) => {
  try {
    const data = await loadData();
    const raffle = data.raffles.find(
      r => Number(r.id) === Number(req.params.id)
    );

    if (!raffle) {
      return res.status(404).json({ error: "raffle not found" });
    }

    res.json(raffle);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server error" });
  }
});


// ==================================================
// CREATE RAFFLE (ADMIN)
// ==================================================
app.post("/raffle/create", checkAdminKey, async (req, res) => {
  try {
    const { id, title, prize, status, dateTime } = req.body;

    if (
      id === undefined ||
      !title ||
      prize === undefined ||
      !status ||
      !dateTime
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const data = await loadData();

    if (data.raffles.find(r => Number(r.id) === Number(id))) {
      return res.status(400).json({ error: "Raffle already exists" });
    }

    const newRaffle = {
      id: Number(id),
      title,
      prize: Number(prize),
      status,
      winner: "",
      dateTime,
      participants: []
    };

    data.raffles.push(newRaffle);
    await saveData(data);

    res.json({ status: "created", raffle: newRaffle });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server error" });
  }
});


// ==================================================
// JOIN RAFFLE
// ==================================================
app.post("/raffle/join", async (req, res) => {
  try {
    const { raffleId, nickname, email } = req.body;

    if (raffleId === undefined || !nickname || !email) {
      return res.status(400).json({ error: "invalid data" });
    }

    const data = await loadData();
    const raffle = data.raffles.find(
      r => Number(r.id) === Number(raffleId)
    );

    if (!raffle) {
      return res.status(404).json({ error: "raffle not found" });
    }

    raffle.participants = raffle.participants || [];

    if (
      raffle.participants.find(
        p => p.email === email || p.nickname === nickname
      )
    ) {
      return res.json({ status: "already_joined" });
    }

    raffle.participants.push({ nickname, email });
    await saveData(data);

    res.json({
      status: "joined",
      total: raffle.participants.length
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server error" });
  }
});


// ==================================================
// FINISH RAFFLE (ADMIN)
// ==================================================
app.post("/raffle/finish/:id", checkAdminKey, async (req, res) => {
  try {
    const { winner } = req.body;
    if (!winner) {
      return res.status(400).json({ error: "winner is required" });
    }

    const data = await loadData();
    const raffle = data.raffles.find(
      r => Number(r.id) === Number(req.params.id)
    );

    if (!raffle) {
      return res.status(404).json({ error: "raffle not found" });
    }

    raffle.winner = winner;
    raffle.status = "finished";

    await saveData(data);
    res.json({ status: "raffle_finished", raffle });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server error" });
  }
});


// ==================================================
// DELETE RAFFLE (ADMIN)
// ==================================================
app.delete("/raffle/:id", checkAdminKey, async (req, res) => {
  try {
    const data = await loadData();
    const index = data.raffles.findIndex(
      r => Number(r.id) === Number(req.params.id)
    );

    if (index === -1) {
      return res.status(404).json({ error: "raffle not found" });
    }

    const removed = data.raffles.splice(index, 1)[0];
    await saveData(data);

    res.json({ status: "deleted", raffle: removed });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server error" });
  }
});


// ==================================================
// ROOT
// ==================================================
app.get("/", (req, res) => {
  res.send("Raffle server is running");
});


// ==================================================
// START
// ==================================================
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});