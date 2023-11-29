const express = require("express");
const applyMiddleWare = require("./middlewares/applyMiddleware");
const connectDb = require("./db/connectDb");
const app = express();
require("dotenv").config();

const port = process.env.PORT || 5000;

const authenticationRoutes = require("./routes/authentication/index");

applyMiddleWare(app);

app.use(authenticationRoutes);

app.get("/health", (req, res) => {
  res.send("forum server is running");
});

app.all("*", (req, res, next) => {
  const error = new Error(`Can't find ${req.originalUrl} on the server`);
  error.status = 404;
  next(error);
});

app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    message: err.message,
  });
});

const main = async () => {
  await connectDb();

  app.listen(port, () => {
    console.log(`forum server is running of ${port}`);
  });
};

main();
