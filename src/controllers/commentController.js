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

// Comment related API
router.get("/comments", async (req, res) => {
  const result = await commentCollection.find().toArray();
  res.send(result);
});

router.get("/comments/:postId", async (req, res) => {
  const postId = req.params.postId;
  const result = await commentCollection.find({ postId }).toArray();
  res.send(result);
});

router.get("/comments/count/:postId", async (req, res) => {
  const postId = req.params.postId;
  const commentCount = await commentCollection.countDocuments({ postId });
  res.send({ count: commentCount });
});

router.post("/comments", verifyToken, async (req, res) => {
  const comment = req.body;
  const result = await commentCollection.insertOne(comment);
  res.send(result);
});

module.exports = router;
