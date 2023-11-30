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

// User related API
router.get("/users", verifyToken, async (req, res) => {
  const filter = req.query;
  const page = parseInt(req.query.page);
  const size = parseInt(req.query.size);
  const query = {
    name: { $regex: filter.search, $options: "i" },
  };
  const result = await userCollection
    .find(query)
    .skip(page * size)
    .limit(size)
    .toArray();
  res.send(result);
});

router.get("/users/admin/:email", verifyToken, async (req, res) => {
  const email = req.params.email;
  if (email !== req.decoded.email) {
    return res.status(403).send({ message: "Unauthorized access" });
  }
  const query = { email: email };
  const user = await userCollection.findOne(query);
  let admin = false;
  if (user) {
    admin = user?.role === "admin";
  }
  res.send({ admin });
});

router.patch("/users/admin/:id", verifyToken, verifyAdmin, async (req, res) => {
  const id = req.params.id;
  const filter = { _id: new ObjectId(id) };
  const updatedDoc = {
    $set: {
      role: "admin",
    },
  };
  const result = await userCollection.updateOne(filter, updatedDoc);
  res.send(result);
});

router.get("/users/:email", async (req, res) => {
  const query = { email: req.params.email };
  const result = await userCollection.findOne(query);
  res.send(result);
});

router.get("/users-count", async (req, res) => {
  const count = await userCollection.estimatedDocumentCount();
  res.send({ count });
});

router.post("/users", async (req, res) => {
  const user = req.body;
  const query = { email: user.email };
  const existedUser = await userCollection.findOne(query);
  if (existedUser) {
    return res.send({ message: "user already existed", insertedId: null });
  }
  const result = await userCollection.insertOne(user);
  res.send(result);
});

module.exports = router;
