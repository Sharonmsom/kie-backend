import express from "express";

const app = express();
app.use(express.json());

const KIE_API_KEY = process.env.KIE_API_KEY;
if (!KIE_API_KEY) {
  console.error("Missing KIE_API_KEY");
  process.exit(1);
}

const KIE_BASE = "https://api.kie.ai";

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.get("/", (req, res) => res.send("OK"));

app.post("/create-video", async (req, res) => {
  try {
    const { prompt, aspect_ratio = "9:16", duration = "5", sound = false } = req.body || {};
    if (!prompt) return res.status(400).json({ error: "Missing prompt" });

    const payload = {
      model: "kling-2.6/text-to-video",
      input: { prompt, aspect_ratio, duration: String(duration), sound: !!sound }
    };

    const r = await fetch(`${KIE_BASE}/api/v1/jobs/createTask`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KIE_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await r.json();
    res.json({ taskId: data.data.taskId });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.get("/task/:id", async (req, res) => {
  try {
    const r = await fetch(
      `${KIE_BASE}/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(req.params.id)}`,
      { headers: { Authorization: `Bearer ${KIE_API_KEY}` } }
    );

    const data = await r.json();
    let urls = [];

    if (data?.data?.resultJson) {
      try {
        urls = JSON.parse(data.data.resultJson).resultUrls || [];
      } catch {}
    }

    res.json({
      state: data?.data?.state,
      resultUrls: urls,
      failMsg: data?.data?.failMsg || ""
    });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.listen(process.env.PORT || 3000);
