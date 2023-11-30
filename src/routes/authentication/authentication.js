const express = require("express");
const createToken = require("../../authentication/createToken");
const router = require("express").Router();

// jwt related api
router.post("/jwt", createToken);

module.exports = router;
