const express = require("express");
const { ObjectId } = require("mongodb");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const router = express.Router();

// Payment Intent
router.post("/create-payment-intent", async (req, res) => {
  const { price } = req.body;
  const amount = parseInt(price * 100);
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount,
    currency: "usd",
    payment_method_types: ["card"],
  });
  res.send({
    clientSecret: paymentIntent.client_secret,
  });
});

router.post("/payments", async (req, res) => {
  const payment = req.body;
  const paymentResult = await paymentCollection.insertOne(payment);

  const userId = payment.userId;
  const newBadge = "Gold";
  const userUpdateResult = await userCollection.updateOne(
    { _id: new ObjectId(userId) },
    { $set: { badge: newBadge } }
  );
  res.send({ paymentResult, userUpdateResult });
});

module.exports = router;
