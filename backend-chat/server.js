import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import bodyParser from "body-parser";

dotenv.config();

const app = express();
app.use(helmet());
app.use(cors());
app.use(bodyParser.json({ limit: "1mb" }));

const PORT = process.env.PORT || 5001;
const GROQ_KEY = process.env.GROQ_API_KEY || "PASTE_YOUR_GROQ_KEY_HERE";

// We'll use a fast, free Llama 3.1 model from Groq
const MODEL = "llama-3.1-8b-instant";

console.log("Using Groq model:", MODEL);
console.log("Groq KEY present?", GROQ_KEY && GROQ_KEY !== "PASTE_YOUR_GROQ_KEY_HERE");

// ================= CHAT ENDPOINT =================
app.post("/api/chat", async (req, res) => {
  const { message } = req.body || {};

  if (!message || typeof message !== "string") {
    return res.json({ reply: "❌ Message missing or invalid." });
  }

  // If no Groq key, use mock mode
  if (!GROQ_KEY || GROQ_KEY === "PASTE_YOUR_GROQ_KEY_HERE") {
    return res.json({
      reply: `MockBot: You said "${message}". Add GROQ_API_KEY in .env to get real AI replies.`,
    });
  }

  try {
    // Groq uses an OpenAI-compatible chat/completions API
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are a friendly Study Buddy AI. Explain things simply and clearly to students.",
          },
          {
            role: "user",
            content: message,
          },
        ],
        temperature: 0.3,
        max_tokens: 400,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Groq API error:", errorText);
      return res.json({
        reply: `⚠️ Groq API error: ${response.status} ${response.statusText}`,
      });
    }

    const data = await response.json();
    const reply =
      data.choices?.[0]?.message?.content ||
      "⚠️ No reply content received from Groq.";

    return res.json({ reply });
  } catch (err) {
    console.error("Groq fetch error:", err);
    return res.json({
      reply: `⚠️ Error calling Groq API: ${err.message || err}`,
    });
  }
});

// ============ HEALTH CHECK ===============
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    mode: GROQ_KEY && GROQ_KEY !== "PASTE_YOUR_GROQ_KEY_HERE" ? "groq" : "mock",
    model: MODEL,
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Chat backend (Groq) running at http://localhost:${PORT}`);
});
