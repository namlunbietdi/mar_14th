const User = require("../models/User");

async function attachCurrentUser(req, res, next) {
  const userId = req.header("x-user-id");

  if (!userId) {
    req.currentUser = null;
    return next();
  }

  try {
    const user = await User.findById(userId);
    req.currentUser = user;
    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Thong tin xac thuc khong hop le."
    });
  }
}

function requireAuth(req, res, next) {
  if (!req.currentUser) {
    return res.status(401).json({
      success: false,
      message: "Ban can dang nhap de tiep tuc."
    });
  }

  return next();
}

function requireAdmin(req, res, next) {
  if (!req.currentUser || req.currentUser.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Chi admin moi duoc phep thuc hien thao tac nay."
    });
  }

  return next();
}

module.exports = {
  attachCurrentUser,
  requireAuth,
  requireAdmin
};
