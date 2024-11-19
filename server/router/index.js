const express = require("express");
const registerUser = require("../controller/RegisterUser.js");
const checkEmail = require("../controller/Checkemail.js");
const checkPassword = require("../controller/checkpassword.js");
const userDetails = require("../controller/userDetail.js");
const logout = require("../controller/logout.js");
const updateUserDetails = require("../controller/updateDetails.js");
const searchUser = require("../controller/searchUser.js");

const router = express.Router();

//create user api
router.post("/register", registerUser);
//check user email
router.post("/email", checkEmail);
//check user password
router.post("/password", checkPassword);
//login user details
router.get("/user-details", userDetails);
//logout user
router.get("/logout", logout);
//update user details
router.post("/update-user", updateUserDetails);
//search user
router.post("/search-user", searchUser);

module.exports = router;
