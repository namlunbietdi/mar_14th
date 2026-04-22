const express = require("express");
const path = require("path");
const { attachCurrentUser } = require("./middleware/auth");
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const employeeRoutes = require("./routes/employees");
const vehicleTypeRoutes = require("./routes/vehicle-types");
const vehicleRoutes = require("./routes/vehicles");
const deviceRoutes = require("./routes/devices");
const dispatchOrderRoutes = require("./routes/dispatch-orders");
const monitoringRoutes = require("./routes/monitoring");
const routeRoutes = require("./routes/routes");
const stopRoutes = require("./routes/stops");
const routeDirectionRoutes = require("./routes/route-directions");

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.use("/api/auth", authRoutes);
app.use("/api", attachCurrentUser);
app.use("/api/users", userRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/vehicle-types", vehicleTypeRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/devices", deviceRoutes);
app.use("/api/dispatch-orders", dispatchOrderRoutes);
app.use("/api/monitoring", monitoringRoutes);
app.use("/api/routes", routeRoutes);
app.use("/api/stops", stopRoutes);
app.use("/api/route-directions", routeDirectionRoutes);

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

module.exports = app;
