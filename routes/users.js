const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { requireAdmin, requireAuth } = require("../middleware/auth");
const { mapUser } = require("../utils/mappers");

const router = express.Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const search = String(req.query.search || "").trim();
    const query = search
      ? {
          $or: [
            { username: { $regex: search, $options: "i" } },
            { fullName: { $regex: search, $options: "i" } },
            { position: { $regex: search, $options: "i" } },
            { role: { $regex: search, $options: "i" } }
          ]
        }
      : {};

    const users = await User.find(query).sort({ createdAt: -1 });

    return res.json({
      success: true,
      currentUser: mapUser(req.currentUser),
      users: users.map(mapUser)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Không thể lay danh sach người dùng."
    });
  }
});

router.post("/", requireAdmin, async (req, res) => {
  const { username, password, role, fullName, position } = req.body;

  try {
    if (!username || !password || !role || !fullName || !position) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhap day du thông tin người dùng."
      });
    }

    const existingUser = await User.findOne({ username: String(username || "").trim() });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Ten dang nhap da ton tai."
      });
    }

    const hashedPassword = await bcrypt.hash(String(password || ""), 10);

    const user = await User.create({
      username: String(username || "").trim(),
      password: hashedPassword,
      role,
      fullName: String(fullName || "").trim(),
      position: String(position || "").trim()
    });

    return res.status(201).json({
      success: true,
      message: "Đã thêm người dùng moi.",
      user: mapUser(user)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Không thể them người dùng."
    });
  }
});

router.put("/:id", requireAdmin, async (req, res) => {
  const { username, password, role, fullName, position } = req.body;

  try {
    if (!username || !role || !fullName || !position) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhap day du thông tin người dùng."
      });
    }

    const existingUser = await User.findOne({
      username: String(username || "").trim(),
      _id: { $ne: req.params.id }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Ten dang nhap da ton tai."
      });
    }

    const updateData = {
      username: String(username || "").trim(),
      role,
      fullName: String(fullName || "").trim(),
      position: String(position || "").trim()
    };

    if (String(password || "").trim()) {
      updateData.password = await bcrypt.hash(String(password).trim(), 10);
    }

    const user = await User.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng."
      });
    }

    return res.json({
      success: true,
      message: "Đã cập nhật người dùng.",
      user: mapUser(user)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Không thể cap nhat người dùng."
    });
  }
});

router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    if (String(req.currentUser._id) === req.params.id) {
      return res.status(400).json({
        success: false,
        message: "Không thể xoa tài khoản dang dang nhap."
      });
    }

    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng."
      });
    }

    return res.json({
      success: true,
      message: "Đã xóa người dùng."
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Không thể xoa người dùng."
    });
  }
});

router.post("/:id/reset-password", requireAdmin, async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash("123456", 10);

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { password: hashedPassword },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng."
      });
    }

    return res.json({
      success: true,
      message: `Đã reset mật khẩu cho ${user.username} ve 123456.`
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Không thể reset mật khẩu."
    });
  }
});

module.exports = router;

