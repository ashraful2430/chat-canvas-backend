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

// Post related API
router.get("/posts/all", async (req, res) => {
  const page = parseInt(req.query.page);
  const size = parseInt(req.query.size);
  const filter = req.query;
  const sortBy = req.query.sortBy;
  const query = { tag: { $regex: filter.search, $options: "i" } };

  let aggregationPipeline = [];

  if (sortBy === "popularity") {
    aggregationPipeline.push(
      {
        $addFields: {
          voteDifference: { $subtract: ["$upVote", "$downVote"] },
        },
      },
      {
        $sort: { voteDifference: -1 },
      }
    );
  } else {
    aggregationPipeline.push({
      $sort: { date: -1 },
    });
  }

  aggregationPipeline.push(
    {
      $match: query,
    },
    {
      $skip: page * size,
    },
    {
      $limit: size,
    }
  );

  const result = await postCollection.aggregate(aggregationPipeline).toArray();

  let newData = [];

  for (const post of result) {
    const commentId = post._id.toString();
    const commentCount = await commentCollection.countDocuments({
      postId: commentId,
    });
    const data = { ...post, commentCount };
    newData.push(data);
  }

  res.send(newData);
});

router.get("/postCount", async (req, res) => {
  const count = await postCollection.estimatedDocumentCount();
  res.send({ count });
});

router.patch("/posts/upvote/:id", verifyToken, async (req, res) => {
  const item = req.body;
  const id = req.params.id;
  const filter = { _id: new ObjectId(id) };
  const update = {
    $inc: { upVote: 1 },
  };
  const result = await postCollection.updateOne(filter, update);
  res.send(result);
});

router.patch("/posts/downvote/:id", verifyToken, async (req, res) => {
  const item = req.body;
  const id = req.params.id;
  const filter = { _id: new ObjectId(id) };
  const update = {
    $inc: { downVote: 1 },
  };
  const result = await postCollection.updateOne(filter, update);
  res.send(result);
});

router.get("/posts/all/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await postCollection.findOne(query);
  res.send(result);
});

router.get("/posts/byUser", async (req, res) => {
  const authorEmail = req.query.email;
  const query = { authorEmail: authorEmail };
  const result = await postCollection.find(query).toArray();
  res.send(result);
});

// Add more post-related routes as needed

module.exports = router;
