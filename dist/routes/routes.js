"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const register_1 = require("../controllers/register");
const login_1 = require("../controllers/login");
const router = (0, express_1.Router)();
router.post("/register", register_1.register);
router.post("/login", login_1.login);
exports.default = router;
