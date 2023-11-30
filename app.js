const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 5000;

// Import controllers
const {
  adminController,
  postController,
  userController,
  paymentController,
  commentController,
  announcementController,
} = require("./controllers");

// middleware
const app = express();
app.use(cors());
app.use(express.json());

const uri = process.env.DATABASE_LOCAL; // Use local or prod based on your environment

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    // Add your controllers here
    adminController(app, client);
    postController(app, client);
    userController(app, client);
    paymentController(app, client);
    commentController(app, client);
    announcementController(app, client);

    // ... (other controllers)

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
