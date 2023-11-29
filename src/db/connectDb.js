const mongoose = require("mongoose");
require("dotenv").config();

const getConnectionString = () => {
  let connectionURI;
  if (process.env.NODE_ENV === "development") {
    connectionURI = process.env.DATABASE_LOCAL;
    connectionURI = connectionURI.replace("<username>", process.env.DB_ADMIN);
    connectionURI = connectionURI.replace(
      "<password>",
      process.env.DB_PASSWORD
    );
  } else {
    connectionURI = process.env.DATABASE_PROD;
  }
  return connectionURI;
};

const connectDb = async () => {
  console.log("connecting to database");
  const uri = getConnectionString();
  await mongoose.connect(uri, { dbName: process.env.DB_NAME });
  console.log("connected to database");
};

module.exports = connectDb;
