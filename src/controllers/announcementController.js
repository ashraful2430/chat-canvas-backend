const express = require("express");
const { ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");

const router = express.Router();

// Middleware verify token
const verifyToken = (req, res, next) => {
  if (!req.headers.authorization) {
    return res.status(401).send({ message: "forbidden access" });
  }
  const token = req.headers.authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_SECRET_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
};

// Middleware verify admin
const verifyAdmin = async (req, res, next) => {
  const email = req.decoded.email;
  const query = { email: email };
  const user = await userCollection.findOne(query);
  const isAdmin = user?.role === "admin";
  if (!isAdmin) {
    return res.status(403).send({ message: "forbidden access" });
  }
  next();
};

// Announcement related API
router.post("/announcement", verifyToken, verifyAdmin, async (req, res) => {
  const details = req.body;
  const result = await announcementCollection.insertOne(details);
  res.send(result);
});

router.get("/announcement", async (req, res) => {
  const result = await announcementCollection.find().toArray();
  res.send(result);
});

module.exports = router;
