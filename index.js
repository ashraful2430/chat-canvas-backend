const express = require("express");
const { MongoClient, ServerApiVersion } = require("mongodb");
const cors = require("cors");
const app = express();
require("dotenv").config();
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
    const postCollection = client.db("forumDb").collection("posts");

    // post related api

    app.get("/posts/all", async (req, res) => {
      const result = await postCollection.find().sort({ date: -1 }).toArray();
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

    app.post("/posts", async (req, res) => {
      const posts = req.body;
      const result = await postCollection.insertOne(posts);
      res.send(result);
    });

    //   user related api
    app.get("/users", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.get("/users/:email", async (req, res) => {
      const query = { email: req.params.email };
      const result = await userCollection.findOne(query);
      res.send(result);
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
