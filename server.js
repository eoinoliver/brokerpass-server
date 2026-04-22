const express = require("express");
const cors = require("cors");
const Stripe = require("stripe");

const app = express();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

app.use(express.json());
app.use(cors({ origin: process.env.CLIENT_URL || "*" }));

app.get("/", (req, res) => res.json({ status: "BrokerPass API running" }));

app.post("/create-checkout-session", async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      mode: "payment",
      success_url: process.env.CLIENT_URL + "/?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: process.env.CLIENT_URL + "/",
      metadata: { product: "brokerpass_full_access" },
    });
    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/verify-session", async (req, res) => {
  try {
    const { session_id } = req.query;
    if (!session_id) return res.status(400).json({ error: "No session_id" });
    const session = await stripe.checkout.sessions.retrieve(session_id);
    res.json({ paid: session.payment_status === "paid", email: session.customer_details?.email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/ask", async (req, res) => {
  try {
    const { message } = req.body;
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1000,
        system: "You are BrokerPass, an expert AI study companion for the FNS40821 Certificate IV in Finance and Mortgage Broking (Australia). Help students understand ASIC compliance, loan products, client needs analysis, and professional practices. Be concise and exam-focused. Never give financial advice.",
        messages: [{ role: "user", content: message }]
      })
    });
    const data = await response.json();
    res.json({ reply: data.content?.[0]?.text || "Sorry, try again." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 4242;
app.listen(PORT, () => console.log("BrokerPass API on port " + PORT));
