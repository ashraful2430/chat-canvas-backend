const cors = require("cors");
const express = require("express");

const applyMiddleWare = (app) => {
  app.use(cors());
  app.use(express.json());
};

module.exports = applyMiddleWare;
