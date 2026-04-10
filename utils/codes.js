const Counter = require("../models/Counter");

async function getNextEmployeeCode() {
  const counter = await Counter.findByIdAndUpdate(
    "employee_code",
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  return `HNB${String(counter.seq - 1).padStart(4, "0")}`;
}

async function peekNextEmployeeCode() {
  const counter = await Counter.findById("employee_code");
  const nextSeq = counter ? counter.seq : 0;
  return `HNB${String(nextSeq).padStart(4, "0")}`;
}

async function getNextStopCode() {
  const counter = await Counter.findByIdAndUpdate(
    "stop_code",
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  return `HBS${String(counter.seq - 1).padStart(4, "0")}`;
}

async function peekNextStopCode() {
  const counter = await Counter.findById("stop_code");
  const nextSeq = counter ? counter.seq : 0;
  return `HBS${String(nextSeq).padStart(4, "0")}`;
}

async function getNextDispatchOrderCode() {
  const counter = await Counter.findByIdAndUpdate(
    "dispatch_order_code",
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  return `LENH${String(counter.seq - 1).padStart(5, "0")}`;
}

async function peekNextDispatchOrderCode() {
  const counter = await Counter.findById("dispatch_order_code");
  const nextSeq = counter ? counter.seq : 0;
  return `LENH${String(nextSeq).padStart(5, "0")}`;
}

module.exports = {
  getNextDispatchOrderCode,
  getNextEmployeeCode,
  getNextStopCode,
  peekNextDispatchOrderCode,
  peekNextEmployeeCode,
  peekNextStopCode
};
