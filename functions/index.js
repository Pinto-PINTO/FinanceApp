const { onRequest } = require("firebase-functions/v2/https");
const Anthropic = require("@anthropic-ai/sdk");

exports.askClaude = onRequest(async (req, res) => {
  // ── Manual CORS headers — works for every origin ──
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  // Only allow POST
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { system, user } = req.body;

  if (!system || !user) {
    res.status(400).json({ error: "Missing system or user prompt" });
    return;
  }

  try {
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const message = await client.messages.create({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 1000,
      system,
      messages: [{ role: "user", content: user }],
    });

    res.status(200).json({ text: message.content[0].text });
  } catch (error) {
    console.error("Anthropic API Error:", error);
    res.status(500).json({ error: "Failed to communicate with Claude" });
  }
});
