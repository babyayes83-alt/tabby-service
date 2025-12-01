import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

// ---------------------------
// ENV VARIABLES
// ---------------------------
const EASY_API_KEY = process.env.EASY_API_KEY;
const MERCHANT_CODE = process.env.MERCHANT_CODE;

// ---------------------------
// MAIN WEBHOOK ROUTE
// ---------------------------
app.post("/tabby-webhook", async (req, res) => {
  try {
    const data = req.body;

    console.log("Webhook Received:", data);

    const status = data.status;
    const orderId = data.order?.reference_id;

    if (!orderId) {
      console.log("❌ No order ID in webhook payload");
      return res.status(400).send("Missing order ID");
    }

    let newStatus = "";

    if (status === "authorized") newStatus = "paid";
    else if (status === "closed") newStatus = "paid";
    else if (status === "rejected") newStatus = "paid_failed";
    else if (status === "expired") newStatus = "pending_payment";

    if (!newStatus) return res.status(200).send("Ignored");

    // UPDATE Order in EasyOrders
    await axios.patch(
      `https://api.easy-orders.net/api/v1/external-apps/orders/${orderId}/status`,
      { status: newStatus },
      {
        headers: {
          "Api-Key": EASY_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    console.log(`✅ Order ${orderId} updated to ${newStatus}`);

    return res.status(200).send("OK");
  } catch (err) {
    console.error("❌ Webhook Error:", err);
    return res.status(500).send("Webhook failed");
  }
});

// ---------------------------
app.get("/", (req, res) => res.send("Tabby Webhook Running ✔"));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("🚀 Webhook Running on Port", PORT));
