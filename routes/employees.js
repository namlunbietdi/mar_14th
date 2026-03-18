const express = require("express");
const Employee = require("../models/Employee");
const { requireAdmin, requireAuth } = require("../middleware/auth");
const { getNextEmployeeCode, peekNextEmployeeCode } = require("../utils/codes");
const { escapeCsvValue, normalizeImportedStatus, parseCsvLine } = require("../utils/csv");
const { mapEmployee } = require("../utils/mappers");

const router = express.Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const search = String(req.query.search || "").trim();
    const query = search
      ? {
          $or: [
            { employeeCode: { $regex: search, $options: "i" } },
            { fullName: { $regex: search, $options: "i" } },
            { position: { $regex: search, $options: "i" } }
          ]
        }
      : {};

    const employees = await Employee.find(query).sort({ employeeCode: 1 });

    return res.json({
      success: true,
      employees: employees.map(mapEmployee)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Khong the lay danh sach nhan su."
    });
  }
});

router.get("/next-code", requireAdmin, async (req, res) => {
  try {
    const employeeCode = await peekNextEmployeeCode();

    return res.json({
      success: true,
      employeeCode
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Khong the tao ma nhan vien."
    });
  }
});

router.get("/export", requireAuth, async (req, res) => {
  try {
    const employees = await Employee.find().sort({ createdAt: -1 });
    const header = ["Ma nhan vien", "Ho va ten", "Ngay sinh", "Chuc vu", "Trang thai"];
    const rows = employees.map((employee) => [
      employee.employeeCode,
      employee.fullName,
      new Date(employee.birthDate).toISOString().slice(0, 10),
      employee.position,
      employee.status === "working" ? "Dang lam viec" : "Da nghi"
    ]);

    const csvContent = [header, ...rows]
      .map((row) => row.map(escapeCsvValue).join(","))
      .join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="danh-sach-nhan-su.csv"');
    return res.send(`\uFEFF${csvContent}`);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Khong the export danh sach nhan su."
    });
  }
});

router.get("/export-template", requireAdmin, async (req, res) => {
  const header = ["Ho va ten", "Ngay sinh", "Chuc vu", "Trang thai"];
  const sampleRows = [
    ["Nguyen Van A", "1990-01-15", "Tai xe", "Dang lam viec"],
    ["Tran Thi B", "1995-06-20", "Nhan vien phuc vu", "Da nghi"]
  ];

  const csvContent = [header, ...sampleRows]
    .map((row) => row.map(escapeCsvValue).join(","))
    .join("\n");

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="mau-import-nhan-su.csv"');
  return res.send(`\uFEFF${csvContent}`);
});

router.post("/", requireAdmin, async (req, res) => {
  const { fullName, birthDate, position, status } = req.body;

  try {
    if (!fullName || !birthDate || !position || !status) {
      return res.status(400).json({
        success: false,
        message: "Vui long nhap day du thong tin nhan vien."
      });
    }

    const employeeCode = await getNextEmployeeCode();

    const employee = await Employee.create({
      employeeCode,
      fullName: String(fullName || "").trim(),
      birthDate,
      position: String(position || "").trim(),
      status
    });

    return res.status(201).json({
      success: true,
      message: "Da them nhan vien moi.",
      employee: mapEmployee(employee)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Khong the them nhan vien."
    });
  }
});

router.put("/:id", requireAdmin, async (req, res) => {
  const { fullName, birthDate, position, status } = req.body;

  try {
    if (!fullName || !birthDate || !position || !status) {
      return res.status(400).json({
        success: false,
        message: "Vui long nhap day du thong tin nhan vien."
      });
    }

    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      {
        fullName: String(fullName || "").trim(),
        birthDate,
        position: String(position || "").trim(),
        status
      },
      {
        new: true,
        runValidators: true
      }
    );

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Khong tim thay nhan vien."
      });
    }

    return res.json({
      success: true,
      message: "Da cap nhat nhan vien.",
      employee: mapEmployee(employee)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Khong the cap nhat nhan vien."
    });
  }
});

router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const employee = await Employee.findByIdAndDelete(req.params.id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Khong tim thay nhan vien."
      });
    }

    return res.json({
      success: true,
      message: "Da xoa nhan vien."
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Khong the xoa nhan vien."
    });
  }
});

router.post("/import", requireAdmin, async (req, res) => {
  const { csvContent } = req.body;

  try {
    if (!csvContent || !String(csvContent).trim()) {
      return res.status(400).json({
        success: false,
        message: "File CSV rong hoac khong hop le."
      });
    }

    const normalizedContent = String(csvContent).replace(/^\uFEFF/, "").replace(/\r/g, "");
    const lines = normalizedContent.split("\n").map((line) => line.trim()).filter(Boolean);

    if (lines.length < 2) {
      return res.status(400).json({
        success: false,
        message: "File CSV phai co it nhat 1 dong du lieu."
      });
    }

    const dataLines = lines.slice(1);
    const employeesToInsert = [];

    for (const line of dataLines) {
      const [fullName, birthDate, position, statusLabel] = parseCsvLine(line);
      const status = normalizeImportedStatus(statusLabel);

      if (!fullName || !birthDate || !position || !status) {
        return res.status(400).json({
          success: false,
          message: "Noi dung CSV khong hop le. Can dung 4 cot: Ho va ten, Ngay sinh, Chuc vu, Trang thai."
        });
      }

      const employeeCode = await getNextEmployeeCode();
      employeesToInsert.push({
        employeeCode,
        fullName: String(fullName).trim(),
        birthDate,
        position: String(position).trim(),
        status
      });
    }

    await Employee.insertMany(employeesToInsert);

    return res.json({
      success: true,
      message: `Da import ${employeesToInsert.length} nhan vien vao he thong.`
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Khong the import file CSV."
    });
  }
});

module.exports = router;
