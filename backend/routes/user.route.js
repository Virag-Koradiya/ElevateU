import express from "express";
import { login, logout, register, updateProfile, renderUserInfoPage } from "../controllers/auth.controller.js";
import { singleUpload } from "../middlewares/multer.js";
import isAuthenticated from "../middlewares/isAuthenticated.js";
 
const router = express.Router();

router.route("/register").post(singleUpload, register);
router.route("/login").post(login);
router.route("/logout").get(logout);
router.route("/profile/update").patch(isAuthenticated,singleUpload,updateProfile);
router.route("/ssr-info").get(isAuthenticated, renderUserInfoPage);

export default router;