const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { mapUser } = require("../utils/mappers");

const router = express.Router();

router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username: String(username || "").trim() });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Sai ten dang nhap hoac mat khau."
      });
    }

    const isPasswordValid = await bcrypt.compare(String(password || ""), user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Sai ten dang nhap hoac mat khau."
      });
    }

    return res.json({
      success: true,
      user: mapUser(user)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Khong the dang nhap luc nay."
    });
  }
});

module.exports = router;
