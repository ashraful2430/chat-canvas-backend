const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const app = express();
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_ADMIN}:${process.env.DB_PASSWORD}@cluster0.cy95lx0.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });

    const userCollection = client.db("forumDb").collection("users");
    const paymentCollection = client.db("forumDb").collection("payments");
    const postCollection = client.db("forumDb").collection("posts");
    const adminReportCollection = client
      .db("forumDb")
      .collection("adminReport");
    const commentCollection = client.db("forumDb").collection("comments");
    const reportCollection = client.db("forumDb").collection("reports");
    const announcementCollection = client
      .db("forumDb")
      .collection("announcement");

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

    // verify admin api
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

    // admin report
    app.post("/admin-report", verifyToken, verifyAdmin, async (req, res) => {
      const info = req.body;
      const result = await adminReportCollection.insertOne(info);
      res.send(result);
    });
    // forum stat related api
    app.get("/forum-stats", verifyToken, verifyAdmin, async (req, res) => {
      const postCount = await postCollection.estimatedDocumentCount();
      const userCount = await userCollection.estimatedDocumentCount();
      const commentCount = await commentCollection.estimatedDocumentCount();

      res.send({
        postCount,
        userCount,
        commentCount,
      });
    });

    app.get("/chart-stats", async (req, res) => {
      const postCount = await postCollection.estimatedDocumentCount();
      const userCount = await userCollection.estimatedDocumentCount();
      const commentCount = await commentCollection.estimatedDocumentCount();
      const statArray = [
        { category: "post", quantity: postCount },
        { category: "user", quantity: userCount },
        { category: "comment", quantity: commentCount },
      ];
      res.send(statArray);
    });

    // announcement related api
    app.post("/announcement", verifyToken, verifyAdmin, async (req, res) => {
      const details = req.body;
      const result = await announcementCollection.insertOne(details);
      res.send(result);
    });

    app.get("/announcement", async (req, res) => {
      const result = await announcementCollection.find().toArray();
      res.send(result);
    });

    // report comments related api

    app.get("/report", async (req, res) => {
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      const result = await reportCollection
        .find()
        .skip(page * size)
        .limit(size)
        .toArray();
      res.send(result);
    });
    app.get("/report-count", async (req, res) => {
      const count = await reportCollection.estimatedDocumentCount();
      res.send({ count });
    });

    app.post("/report", verifyToken, async (req, res) => {
      const report = req.body;
      const result = await reportCollection.insertOne(report);
      res.send(result);
    });

    // jwt related api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_SECRET_TOKEN, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // comment related api

    app.get("/comments", async (req, res) => {
      const result = await commentCollection.find().toArray();
      res.send(result);
    });

    app.get("/comments/:postId", async (req, res) => {
      const postId = req.params.postId;
      const result = await commentCollection.find({ postId }).toArray();
      res.send(result);
    });

    app.get("/comments/count/:postId", async (req, res) => {
      const postId = req.params.postId;
      const commentCount = await commentCollection.countDocuments({ postId });
      res.send({ count: commentCount });
    });

    app.post("/comments", verifyToken, async (req, res) => {
      const comment = req.body;
      const result = await commentCollection.insertOne(comment);
      res.send(result);
    });

    // post related api

    app.get("/posts/all", async (req, res) => {
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

      const result = await postCollection
        .aggregate(aggregationPipeline)
        .toArray();

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

    app.get("/postCount", async (req, res) => {
      const count = await postCollection.estimatedDocumentCount();
      res.send({ count });
    });

    app.patch("/posts/upvote-down/:id", verifyToken, async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const update = {
        $inc: { upVote: -1 },
      };
      const result = await postCollection.updateOne(filter, update);
      res.send(result);
    });
    app.patch("/posts/downvote-down/:id", verifyToken, async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const update = {
        $inc: { downVote: -1 },
      };
      const result = await postCollection.updateOne(filter, update);
      res.send(result);
    });
    app.patch("/posts/upvote/:id", verifyToken, async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const update = {
        $inc: { upVote: 1 },
      };
      const result = await postCollection.updateOne(filter, update);
      res.send(result);
    });
    app.patch("/posts/downvote/:id", verifyToken, async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const update = {
        $inc: { downVote: 1 },
      };
      const result = await postCollection.updateOne(filter, update);
      res.send(result);
    });

    app.get("/posts/all/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await postCollection.findOne(query);
      res.send(result);
    });

    app.get("/posts/byUser", async (req, res) => {
      const authorEmail = req.query.email;
      const query = { authorEmail: authorEmail };
      const result = await postCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/count/:email", async (req, res) => {
      const authorEmail = req.params.email;

      const result = await postCollection
        .aggregate([
          {
            $match: { authorEmail: authorEmail },
          },
          {
            $group: {
              _id: "$authorEmail",
              postCount: { $sum: 1 },
            },
          },
        ])
        .toArray();

      if (result.length > 0) {
        res.send({ postCount: result[0].postCount });
      } else {
        res.send({ postCount: 0 });
      }
    });

    app.get("/posts/limit", async (req, res) => {
      const authorEmail = req.query.email;
      const query = { authorEmail: authorEmail };
      const result = await postCollection
        .find(query)
        .sort({ date: -1 })
        .limit(3)
        .toArray();
      res.send(result);
    });

    app.post("/posts", verifyToken, async (req, res) => {
      const posts = req.body;
      const result = await postCollection.insertOne(posts);
      res.send(result);
    });

    app.delete("/posts/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await postCollection.deleteOne(query);
      res.send(result);
    });

    //   user related api
    app.get("/users", verifyToken, async (req, res) => {
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

    app.get("/users/admin/:email", verifyToken, async (req, res) => {
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

    app.patch(
      "/users/admin/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updatedDoc = {
          $set: {
            role: "admin",
          },
        };
        const result = await userCollection.updateOne(filter, updatedDoc);
        res.send(result);
      }
    );

    app.get("/users/:email", async (req, res) => {
      const query = { email: req.params.email };
      const result = await userCollection.findOne(query);
      res.send(result);
    });

    app.get("/users-count", async (req, res) => {
      const count = await userCollection.estimatedDocumentCount();
      res.send({ count });
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existedUser = await userCollection.findOne(query);
      if (existedUser) {
        return res.send({ message: "user already existed", insertedId: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    // payment intent
    app.post("/create-payment-intent", async (req, res) => {
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

    app.post("/payments", async (req, res) => {
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

    // connected to mongodb
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/health", (req, res) => {
  res.send("forum server is running");
});
app.listen(port, () => {
  console.log(`forum server is running of ${port}`);
});
