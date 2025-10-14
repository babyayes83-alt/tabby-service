import express from "express";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ type: "*/*" }));

app.get("/health", (req, res) => res.status(200).send("OK"));

async function capturePayment(paymentId) {
  const url = `https://api.tabby.ai/api/v2/payments/${paymentId}/captures`;
  return axios.post(url, {}, {
    headers: { Authorization: `Bearer ${process.env.TABBY_SECRET_KEY}` }
  });
}

async function retrievePayment(paymentId) {
  const url = `https://api.tabby.ai/api/v2/payments/${paymentId}`;
  return axios.get(url, {
    headers: { Authorization: `Bearer ${process.env.TABBY_SECRET_KEY}` }
  });
}

app.post("/webhook", async (req, res) => {
  try {
    const event = req.body || {};
    console.log("Tabby webhook received:", JSON.stringify(event));

    const { type, data } = event;
    if (type === "payment.authorized" && process.env.AUTOCAPTURE === "true") {
      const paymentId = data?.id || data?.payment?.id || data?.payment_id;
      if (paymentId) {
        try {
          const r = await capturePayment(paymentId);
          console.log("Auto-capture:", r.status, r.data?.status);
        } catch (e) {
          console.error("Auto-capture failed:", e?.response?.data || e.message);
        }
      }
    }

    res.status(200).send("Webhook received");
  } catch (e) {
    console.error("Webhook error:", e);
    res.status(200).send("ok");
  }
});

app.post("/capture/:paymentId", async (req, res) => {
  try {
    const r = await capturePayment(req.params.paymentId);
    res.status(200).json(r.data);
  } catch (e) {
    res.status(e?.response?.status || 500).json(e?.response?.data || { error: e.message });
  }
});

app.get("/payment/:paymentId", async (req, res) => {
  try {
    const r = await retrievePayment(req.params(paymentId));
    res.status(200).json(r.data);
  } catch (e) {
    res.status(e?.response?.status || 500).json(e?.response?.data || { error: e.message });
  }
});

app.listen(PORT, () => console.log(`Server running on :${PORT}`));
