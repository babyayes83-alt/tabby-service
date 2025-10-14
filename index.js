import express from "express";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// مهم: تأكد أننا نقرأ JSON لأي Content-Type
app.use(express.json({ type: "*/*" }));

// Health check
app.get("/health", (req, res) => res.status(200).send("OK"));

// دوال مساعدة مع Tabby API
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

// ====== Webhook المهم ======
app.post("/webhook", (req, res) => {
  try {
    // اطبع كل ما يصل من Tabby/المتجر للتشخيص
    console.log("✅ Webhook received:", JSON.stringify(req.body));

    const { type, event, data, payment_id, payment } = req.body || {};

    // التعرّف على الـ paymentId من أكثر من شكل payload
    const paymentId =
      data?.id ||
      data?.payment?.id ||
      payment_id ||
      payment?.id ||
      req.body?.id;

    // مثال: التقاط تلقائي بعد authorization إذا كان AUTOCAPTURE=true
    if ((type === "payment.authorized" || event === "payment.authorized") &&
        process.env.AUTOCAPTURE === "true" &&
        paymentId) {
      capturePayment(paymentId)
        .then(r => console.log("🤖 Auto-capture OK:", r.status))
        .catch(e => console.error("❌ Auto-capture failed:", e?.response?.data || e.message));
    }

    // رد سريع 200 حتى لا تعيد الجهة الإرسال
    res.status(200).send("ok");
  } catch (e) {
    console.error("Webhook handler error:", e);
    res.status(200).send("ok");
  }
});

// نقاط مساعدة اختيارية
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
    const r = await retrievePayment(req.params.paymentId);
    res.status(200).json(r.data);
  } catch (e) {
    res.status(e?.response?.status || 500).json(e?.response?.data || { error: e.message });
  }
});

app.listen(PORT, () => console.log(`Server running on :${PORT}`));
