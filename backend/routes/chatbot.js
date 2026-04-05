const express = require("express");
const { InferenceClient } = require("@huggingface/inference");

const router = express.Router();
const client = new InferenceClient(process.env.HF_TOKEN);

// System prompt focused on Indian personal finance
const SYSTEM_PROMPT = `You are Sterling, a knowledgeable Indian personal finance advisor. 
You help users understand loans, EMIs, FOIR, CIBIL scores, SIPs, and financial planning. 
Keep responses concise, practical, and focused on Indian financial context (INR, RBI guidelines, Indian tax laws). 
Never give specific investment advice — always recommend consulting a SEBI-registered advisor for complex decisions.`;

router.post("/chat", async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message required" });
    }

    // Build messages array with optional conversation history
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.slice(-6), // keep last 3 exchanges for context
      { role: "user", content: String(message) }
    ];

// backend/routes/chatbot.js

const chatCompletion = await client.chatCompletion({
  // This distilled version is specifically optimized for free serverless inference
  model: "deepseek-ai/DeepSeek-R1-Distill-Qwen-7B", 
  messages,
  max_tokens: 512,
  temperature: 0.7,
});

    const reply =
      chatCompletion?.choices?.[0]?.message?.content?.trim() ||
      "I couldn't generate a response. Please try again.";

    return res.json({ reply });

  } catch (err) {
    console.error("Chatbot error:", err?.httpResponse?.body || err.message);

    // Friendlier error messages based on status
    const status = err?.httpResponse?.status;
    if (status === 503) {
      return res.status(503).json({ error: "Model is loading, please retry in 20 seconds." });
    }
    if (status === 429) {
      return res.status(429).json({ error: "Rate limit hit. Please wait a moment." });
    }

    return res.status(500).json({
      error: "Failed to generate response",
      details: err.message
    });
  }
});

module.exports = router;