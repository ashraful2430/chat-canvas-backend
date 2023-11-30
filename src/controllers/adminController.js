const express = require("express");
const { ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");

const router = express.Router();

// middleware verify token
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

// middleware verify admin
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

// Admin report
router.post("/admin-report", verifyToken, verifyAdmin, async (req, res) => {
  const info = req.body;
  const result = await adminReportCollection.insertOne(info);
  res.send(result);
});

// Forum stat related API
router.get("/forum-stats", verifyToken, verifyAdmin, async (req, res) => {
  const postCount = await postCollection.estimatedDocumentCount();
  const userCount = await userCollection.estimatedDocumentCount();
  const commentCount = await commentCollection.estimatedDocumentCount();

  res.send({
    postCount,
    userCount,
    commentCount,
  });
});

// ... Add more admin controllers ...

module.exports = router;
