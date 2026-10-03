

require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

 const MONGO_URI = process.env.MONGO_URI;
mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.log("❌ MongoDB Connection Error:", err));

const userSchema = new mongoose.Schema({
  email: { type: String, required: true },
  name: { type: String, default: "" },
  role: { type: String, required: true, enum: ["general", "farmer", "admin"] },
  country: { type: String, default: "" },
  gender: { type: String, default: "" },
  passwordHash: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  lastLoginAt: { type: Date }
}, { collection: "users" });
userSchema.index({ email: 1, role: 1 }, { unique: true });
const User = mongoose.model("User", userSchema);

const generalUserSchema = new mongoose.Schema({
  email: String, name: String, role: String, country: String, gender: String,
  passwordHash: String, createdAt: Date, updatedAt: Date, lastLoginAt: Date
}, { collection: "general_users" });
const GeneralUser = mongoose.model("GeneralUser", generalUserSchema);

const farmerUserSchema = new mongoose.Schema({
  email: String, name: String, role: String, country: String, gender: String,
  passwordHash: String, createdAt: Date, updatedAt: Date, lastLoginAt: Date
}, { collection: "farmer_users" });
const FarmerUser = mongoose.model("FarmerUser", farmerUserSchema);

const weatherRequestSchema = new mongoose.Schema({
  email: { type: String, default: "" },
  role: { type: String, default: "" },
  location: { type: String, default: "" },
  temperature: { type: String, default: "" },
  humidity: { type: String, default: "" },
  wind: { type: String, default: "" },
  pressure: { type: String, default: "" },
  condition: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now }
}, { collection: "weather_requests" });
const WeatherRequest = mongoose.model("WeatherRequest", weatherRequestSchema);

const weatherReportSchema = new mongoose.Schema({
  email: { type: String, default: "" },
  role: { type: String, default: "" },
  location: { type: String, default: "" },
  actualCondition: { type: String, default: "" },
  predictedCondition: { type: String, default: "" },
  accuracy: { type: String, enum: ["accurate", "inaccurate"], default: "accurate" },
  createdAt: { type: Date, default: Date.now }
}, { collection: "weather_reports" });
const WeatherReport = mongoose.model("WeatherReport", weatherReportSchema);

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_CONFIG_PATH = path.join(__dirname, "config", "admin.json");
let ADMIN_PASSWORD_HASH = null;
const USERS_CONFIG_PATH = path.join(__dirname, "config", "users.json");
const WEATHER_LOGS_PATH = path.join(__dirname, "config", "weather_logs.json");
const WEATHER_REPORTS_PATH = path.join(__dirname, "config", "weather_reports.json");
const FEEDBACK_LOGS_PATH = path.join(__dirname, "config", "feedback.json");
const ADVICE_CONFIG_PATH = path.join(__dirname, "config", "advice.json");
function readUsers() {
  try {
    if (!fs.existsSync(USERS_CONFIG_PATH)) return [];
    const raw = fs.readFileSync(USERS_CONFIG_PATH, "utf8");
    const arr = JSON.parse(raw || "[]");
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}
function writeUsers(arr) {
  try {
    fs.mkdirSync(path.dirname(USERS_CONFIG_PATH), { recursive: true });
    fs.writeFileSync(USERS_CONFIG_PATH, JSON.stringify(arr, null, 2), "utf8");
  } catch {}
}
function readWeatherLogs() {
  try {
    if (!fs.existsSync(WEATHER_LOGS_PATH)) return [];
    const raw = fs.readFileSync(WEATHER_LOGS_PATH, "utf8");
    const arr = JSON.parse(raw || "[]");
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}
function appendWeatherLog(obj) {
  try {
    const entry = Object.assign({}, obj, { createdAt: new Date().toISOString() });
    const arr = readWeatherLogs();
    arr.unshift(entry);
    fs.mkdirSync(path.dirname(WEATHER_LOGS_PATH), { recursive: true });
    fs.writeFileSync(WEATHER_LOGS_PATH, JSON.stringify(arr.slice(0, 1000), null, 2), "utf8");
  } catch {}
}
function readFeedbackLogs() {
  try {
    if (!fs.existsSync(FEEDBACK_LOGS_PATH)) return [];
    const raw = fs.readFileSync(FEEDBACK_LOGS_PATH, "utf8");
    const arr = JSON.parse(raw || "[]");
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}
function appendFeedbackLog(obj) {
  try {
    const entry = Object.assign({}, obj, { createdAt: new Date().toISOString() });
    const arr = readFeedbackLogs();
    arr.unshift(entry);
    fs.mkdirSync(path.dirname(FEEDBACK_LOGS_PATH), { recursive: true });
    fs.writeFileSync(FEEDBACK_LOGS_PATH, JSON.stringify(arr.slice(0, 1000), null, 2), "utf8");
  } catch {}
}
function readWeatherReports() {
  try {
    if (!fs.existsSync(WEATHER_REPORTS_PATH)) return [];
    const raw = fs.readFileSync(WEATHER_REPORTS_PATH, "utf8");
    const arr = JSON.parse(raw || "[]");
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}
function appendWeatherReport(obj) {
  try {
    const entry = Object.assign({}, obj, { createdAt: new Date().toISOString() });
    const arr = readWeatherReports();
    arr.unshift(entry);
    fs.mkdirSync(path.dirname(WEATHER_REPORTS_PATH), { recursive: true });
    fs.writeFileSync(WEATHER_REPORTS_PATH, JSON.stringify(arr.slice(0, 1000), null, 2), "utf8");
  } catch {}
}

function readAdviceConfig() {
  function defaultCfg() {
    return {
      general: {
        severity: {
          highText: "Thunderstorm risk. Avoid travel if possible and stay indoors.",
          moderateText: "Rain expected. Carry an umbrella and drive carefully.",
          safeText: "Weather conditions are normal today."
        },
        conditions: {
          thunderstormText: "Thunderstorm risk. Avoid travel if possible and stay indoors.",
          rainText: "Rain expected. Carry an umbrella and drive carefully.",
          heatText: "High heat detected. Stay hydrated and avoid peak sun hours.",
          windStrongText: "Damaging winds possible. Secure outdoor items and exercise caution.",
          windModerateText: "Strong winds today. Secure outdoor items.",
          humidityHighText: "High humidity may cause discomfort. Wear light clothing.",
          safeText: "Weather conditions are normal today."
        }
      },
      farmer: {
        severity: {
          highText: "Severe conditions detected. Delay field work and secure equipment.",
          moderateText: "Caution advised. Adjust field operations accordingly.",
          safeText: "Weather conditions are favorable for farming activities."
        },
        conditions: {
          thunderstormText: "Thunderstorm risk. Delay field work and secure equipment.",
          rainText: "Rainfall expected. Avoid fertilizer application and improve drainage.",
          heatText: "High temperature stress. Irrigate crops early morning or evening.",
          windModerateText: "Strong winds may damage crops. Secure young plants.",
          humidityHighText: "High humidity increases fungal disease risk. Monitor crops closely.",
          safeText: "Weather conditions are favorable for farming activities."
        },
        crops: {
          riceHumidityHighText: "High risk of rice blast disease due to humidity.",
          maizeHeatHighText: "Maize heat stress risk. Increase irrigation frequency."
        }
      },
      updatedAt: new Date().toISOString()
    };
  }
  try {
    if (!fs.existsSync(ADVICE_CONFIG_PATH)) return defaultCfg();
    const raw = fs.readFileSync(ADVICE_CONFIG_PATH, "utf8");
    const cfg = JSON.parse(raw || "{}");
    if (!cfg || typeof cfg !== "object") return defaultCfg();
    if (!cfg.general || typeof cfg.general !== "object") cfg.general = defaultCfg().general;
    const g = cfg.general;
    if (!g.severity || typeof g.severity !== "object") {
      const highText = g.highText || defaultCfg().general.severity.highText;
      const moderateText = g.moderateText || defaultCfg().general.severity.moderateText;
      const safeText = g.safeText || defaultCfg().general.severity.safeText;
      g.severity = { highText, moderateText, safeText };
      delete g.highText; delete g.moderateText; delete g.safeText;
    }
    if (!g.conditions || typeof g.conditions !== "object") g.conditions = defaultCfg().general.conditions;
    cfg.general = g;
    if (!cfg.farmer || typeof cfg.farmer !== "object") cfg.farmer = defaultCfg().farmer;
    const f = cfg.farmer;
    if (!f.severity || typeof f.severity !== "object") f.severity = defaultCfg().farmer.severity;
    if (!f.conditions || typeof f.conditions !== "object") f.conditions = defaultCfg().farmer.conditions;
    if (!f.crops || typeof f.crops !== "object") f.crops = defaultCfg().farmer.crops;
    cfg.farmer = f;
    return cfg;
  } catch {
    return defaultCfg();
  }
}
function writeAdviceConfig(cfg) {
  try {
    fs.mkdirSync(path.dirname(ADVICE_CONFIG_PATH), { recursive: true });
    fs.writeFileSync(ADVICE_CONFIG_PATH, JSON.stringify(cfg, null, 2), "utf8");
  } catch {}
}
function ensureAdviceConfig() {
  try {
    if (!fs.existsSync(ADVICE_CONFIG_PATH)) {
      writeAdviceConfig(readAdviceConfig());
    }
  } catch {}
}
function ensureAdminConfig() {
  try {
    if (fs.existsSync(ADMIN_CONFIG_PATH)) {
      const raw = fs.readFileSync(ADMIN_CONFIG_PATH, "utf8");
      const cfg = JSON.parse(raw || "{}");
      if (cfg && typeof cfg.passwordHash === "string") {
        ADMIN_PASSWORD_HASH = cfg.passwordHash;
        return;
      }
    }
  } catch {}
  try {
    const hash = bcrypt.hashSync(ADMIN_PASSWORD, 10);
    ADMIN_PASSWORD_HASH = hash;
    fs.mkdirSync(path.dirname(ADMIN_CONFIG_PATH), { recursive: true });
    fs.writeFileSync(ADMIN_CONFIG_PATH, JSON.stringify({ email: ADMIN_EMAIL, passwordHash: hash }, null, 2), "utf8");
  } catch {}
}
ensureAdminConfig();
ensureAdviceConfig();


app.get("/", (req, res) => {
  res.redirect("/HomePage.html");
});
app.get("/health", async (req, res) => {
  try {
    const usersCount = await User.countDocuments({});
    res.json({ ok: true, mongo: true, usersCount });
  } catch {
    res.json({ ok: true, mongo: false });
  }
});

app.get("/api/weather/geocode", async (req, res) => {
  try {
    const city = String(req.query.city || "").trim();

    if (!city) {
      return res.status(400).json({ error: "City is required" });
    }

    const url =
      "https://api.openweathermap.org/geo/1.0/direct?q=" +
      encodeURIComponent(city) +
      "&limit=1&appid=" +
      process.env.OPENWEATHER_API_KEY;

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.json(data);
  } catch (error) {
    console.error("OpenWeather geocoding error:", error.message);
    res.status(500).json({ error: "Weather service error" });
  }
});

app.get("/api/weather/current", async (req, res) => {
  try {
    const { lat, lon } = req.query;

    if (lat === undefined || lon === undefined) {
      return res.status(400).json({ error: "Latitude and longitude are required" });
    }

    const url =
      "https://api.openweathermap.org/data/2.5/weather?lat=" +
      encodeURIComponent(lat) +
      "&lon=" +
      encodeURIComponent(lon) +
      "&units=metric&appid=" +
      process.env.OPENWEATHER_API_KEY;

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.json(data);
  } catch (error) {
    console.error("OpenWeather current weather error:", error.message);
    res.status(500).json({ error: "Weather service error" });
  }
});

app.get("/api/weather/forecast", async (req, res) => {
  try {
    const { lat, lon } = req.query;

    if (lat === undefined || lon === undefined) {
      return res.status(400).json({ error: "Latitude and longitude are required" });
    }

    const url =
      "https://api.openweathermap.org/data/2.5/forecast?lat=" +
      encodeURIComponent(lat) +
      "&lon=" +
      encodeURIComponent(lon) +
      "&units=metric&appid=" +
      process.env.OPENWEATHER_API_KEY;

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.json(data);
  } catch (error) {
    console.error("OpenWeather forecast error:", error.message);
    res.status(500).json({ error: "Weather service error" });
  }
});


app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, name, role, password, country, gender } = req.body || {};
    const inputEmail = (email || "").trim().toLowerCase();
    if (!inputEmail || !password || !role) return res.status(400).json({ error: "Missing fields" });
    if (role === "admin") return res.status(403).json({ error: "Forbidden" });
    const users = readUsers();
    if (users.find(u => u.email === inputEmail && u.role === role)) return res.status(409).json({ error: "User already exists" });
    const hash = await bcrypt.hash(password, 10);
    const now = new Date().toISOString();
    users.push({ email: inputEmail, name: name || "", role, country: country || "", gender: gender || "", passwordHash: hash, createdAt: now, updatedAt: now, lastLoginAt: null });
    writeUsers(users);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e && e.message ? e.message : "Server error" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, role, password } = req.body || {};
    if (!email || !password || !role) return res.status(400).json({ error: "Missing fields" });
    const inputEmail = (email || "").trim().toLowerCase();
    const adminEmail = (ADMIN_EMAIL || "").trim().toLowerCase();
    if (role === "admin") {
      if (inputEmail !== adminEmail) return res.status(401).json({ error: "Incorrect email or password" });
      const ok = ADMIN_PASSWORD_HASH ? await bcrypt.compare(password, ADMIN_PASSWORD_HASH) : false;
      if (!ok) return res.status(401).json({ error: "Incorrect email or password" });
      res.json({ ok: true });
      return;
    }
    const users = readUsers();
    const idx = users.findIndex(u => u.email === inputEmail && u.role === role);
    if (idx === -1) return res.status(404).json({ error: "User not found" });
    if (users[idx].blocked) return res.status(403).json({ error: "This account has been blocked. Please contact the administrator." });
    const ok = await bcrypt.compare(password, users[idx].passwordHash || "");
    if (!ok) return res.status(401).json({ error: "Incorrect email or password" });
    users[idx].lastLoginAt = new Date().toISOString();
    users[idx].updatedAt = new Date().toISOString();
    const mustChange = !!users[idx].mustChangePassword;
    writeUsers(users);
    res.json({ ok: true, mustChangePassword: mustChange, user: { name: users[idx].name || "", email: users[idx].email, role: users[idx].role, country: users[idx].country || "", gender: users[idx].gender || "" } });
  } catch (e) {
    res.status(500).json({ error: e && e.message ? e.message : "Server error" });
  }
});

app.post("/api/auth/admin/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const inputEmail = (email || "").trim().toLowerCase();
    const adminEmail = (ADMIN_EMAIL || "").trim().toLowerCase();
    if (!inputEmail || !password) return res.status(400).json({ error: "Missing fields" });
    if (inputEmail !== adminEmail) return res.status(401).json({ error: "Incorrect email or password" });
    const ok = ADMIN_PASSWORD_HASH ? await bcrypt.compare(password, ADMIN_PASSWORD_HASH) : false;
    if (!ok) return res.status(401).json({ error: "Incorrect email or password" });
    return res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/admin/password/change", async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) return res.status(400).json({ error: "Missing fields" });
    if (String(newPassword).length < 6) return res.status(400).json({ error: "New password too short" });
    const ok = ADMIN_PASSWORD_HASH ? await bcrypt.compare(currentPassword, ADMIN_PASSWORD_HASH) : false;
    if (!ok) return res.status(401).json({ error: "Current password incorrect" });
    const hash = await bcrypt.hash(String(newPassword), 10);
    ADMIN_PASSWORD_HASH = hash;
    try {
      fs.mkdirSync(path.dirname(ADMIN_CONFIG_PATH), { recursive: true });
      fs.writeFileSync(ADMIN_CONFIG_PATH, JSON.stringify({ email: ADMIN_EMAIL, passwordHash: hash }, null, 2), "utf8");
    } catch {}
    return res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/users/password/change", async (req, res) => {
  try {
    const { email, role, currentPassword, newPassword, forceReset } = req.body || {};
    if (!email || !role || !newPassword) return res.status(400).json({ error: "Missing fields" });
    const users = readUsers();
    const idx = users.findIndex(u => u.email === (email || "").trim().toLowerCase() && u.role === role);
    if (idx === -1) return res.status(404).json({ error: "User not found" });
    const isForcedReset = !!forceReset && !!users[idx].mustChangePassword;
    if (!isForcedReset && users[idx].passwordHash) {
      if (!currentPassword) return res.status(400).json({ error: "Enter current password" });
      const ok = await bcrypt.compare(currentPassword, users[idx].passwordHash || "");
      if (!ok) return res.status(401).json({ error: "Current password incorrect" });
    }
    if (String(newPassword).length < 6) return res.status(400).json({ error: "New password must be at least 6 characters" });
    const hash = await bcrypt.hash(newPassword, 10);
    users[idx].passwordHash = hash;
    users[idx].mustChangePassword = false;
    users[idx].updatedAt = new Date().toISOString();
    writeUsers(users);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/admin/users", async (req, res) => {
  try {
    const users = readUsers().filter(u => u.role === "general" || u.role === "farmer").map(u => {
      if (typeof u.blocked !== "boolean") u.blocked = false;
      return u;
    });
    res.json({ ok: true, users });
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/admin/users/block", async (req, res) => {
  try {
    const { email, role, block } = req.body || {};
    if (!email || !role) return res.status(400).json({ error: "Missing fields" });
    const users = readUsers();
    const idx = users.findIndex(u => (u.email || "").trim().toLowerCase() === String(email).trim().toLowerCase() && u.role === role);
    if (idx === -1) return res.status(404).json({ error: "User not found" });
    users[idx].blocked = !!block;
    users[idx].updatedAt = new Date().toISOString();
    writeUsers(users);
    res.json({ ok: true, blocked: !!block });
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/admin/feedback", async (req, res) => {
  try {
    const logs = readFeedbackLogs();
    res.json({ ok: true, feedback: logs });
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/feedback/log", async (req, res) => {
  try {
    const { email, role, subject, source } = req.body || {};
    if (!email || !role) return res.status(400).json({ error: "Missing fields" });
    appendFeedbackLog({
      email: String(email || ""),
      role: String(role || ""),
      subject: String(subject || ""),
      source: String(source || "")
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/weather/report", async (req, res) => {
  try {
    const { email, role, location, actualCondition, predictedCondition, accuracy } = req.body || {};
    if (!location || !accuracy) return res.status(400).json({ error: "Missing fields" });
    
    const obj = {
      email: email || "",
      role: role || "",
      location: location || "",
      actualCondition: actualCondition || "",
      predictedCondition: predictedCondition || "",
      accuracy: accuracy || "accurate"
    };

    try {
      await WeatherReport.create(obj);
    } catch (err) {
      appendWeatherReport(obj);
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/admin/weather/reports", async (req, res) => {
  try {
    try {
      const reports = await WeatherReport.find({}).sort({ createdAt: -1 }).limit(500).lean();
      res.json({ ok: true, reports });
    } catch (err) {
      const reports = readWeatherReports();
      res.json({ ok: true, reports });
    }
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/admin/users/delete", async (req, res) => {
  try {
    const { email, role } = req.body || {};
    if (!email || !role) return res.status(400).json({ error: "Missing fields" });
    const users = readUsers();
    const filtered = users.filter(u => !((u.email || "").trim().toLowerCase() === String(email).trim().toLowerCase() && u.role === role));
    writeUsers(filtered);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/admin/users/reset-password", async (req, res) => {
  try {
    const { email, role, newPassword } = req.body || {};
    if (!email || !role || !newPassword) return res.status(400).json({ error: "Missing fields" });
    if (String(newPassword).length < 6) return res.status(400).json({ error: "New password must be at least 6 characters" });
    const users = readUsers();
    const idx = users.findIndex(u => (u.email || "").trim().toLowerCase() === String(email).trim().toLowerCase() && u.role === role);
    if (idx === -1) return res.status(404).json({ error: "User not found" });
    const hash = await bcrypt.hash(String(newPassword), 10);
    users[idx].passwordHash = hash;
    users[idx].mustChangePassword = true;
    users[idx].updatedAt = new Date().toISOString();
    writeUsers(users);
    res.json({ ok: true, temporaryPassword: String(newPassword) });
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/advice/config", async (req, res) => {
  try {
    const cfg = readAdviceConfig();
    res.json({ ok: true, general: cfg.general, farmer: cfg.farmer, updatedAt: cfg.updatedAt || null });
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
});
app.post("/api/admin/advice/config", async (req, res) => {
  try {
    const body = req.body || {};
    const gen = body.general || {};
    const sev = gen.severity || {};
    const cond = gen.conditions || {};
    const current = readAdviceConfig();
    const g = current.general;
    function pickStr(v, fallback) { return typeof v === "string" ? v : fallback; }
    g.severity = {
      highText: pickStr(sev.highText, g.severity.highText),
      moderateText: pickStr(sev.moderateText, g.severity.moderateText),
      safeText: pickStr(sev.safeText, g.severity.safeText)
    };
    g.conditions = {
      thunderstormText: pickStr(cond.thunderstormText, g.conditions.thunderstormText),
      rainText: pickStr(cond.rainText, g.conditions.rainText),
      heatText: pickStr(cond.heatText, g.conditions.heatText),
      windStrongText: pickStr(cond.windStrongText, g.conditions.windStrongText),
      windModerateText: pickStr(cond.windModerateText, g.conditions.windModerateText),
      humidityHighText: pickStr(cond.humidityHighText, g.conditions.humidityHighText),
      safeText: pickStr(cond.safeText, g.conditions.safeText)
    };
    current.general = g;
    const farmer = body.farmer || {};
    const fsev = farmer.severity || {};
    const fcond = farmer.conditions || {};
    const fcrops = farmer.crops || {};
    const f = current.farmer;
    f.severity = {
      highText: pickStr(fsev.highText, f.severity.highText),
      moderateText: pickStr(fsev.moderateText, f.severity.moderateText),
      safeText: pickStr(fsev.safeText, f.severity.safeText)
    };
    f.conditions = {
      thunderstormText: pickStr(fcond.thunderstormText, f.conditions.thunderstormText),
      rainText: pickStr(fcond.rainText, f.conditions.rainText),
      heatText: pickStr(fcond.heatText, f.conditions.heatText),
      windModerateText: pickStr(fcond.windModerateText, f.conditions.windModerateText),
      humidityHighText: pickStr(fcond.humidityHighText, f.conditions.humidityHighText),
      safeText: pickStr(fcond.safeText, f.conditions.safeText)
    };
    f.crops = {
      riceHumidityHighText: pickStr(fcrops.riceHumidityHighText, f.crops.riceHumidityHighText),
      maizeHeatHighText: pickStr(fcrops.maizeHeatHighText, f.crops.maizeHeatHighText)
    };
    current.farmer = f;
    current.updatedAt = new Date().toISOString();
    writeAdviceConfig(current);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
});
app.get("/api/admin/stats", async (req, res) => {
  try {
    const users = readUsers();
    const totalUsers = users.filter(u => u.role === "general" || u.role === "farmer").length;
    const farmersCount = users.filter(u => u.role === "farmer").length;
    const generalCount = users.filter(u => u.role === "general").length;
    let weatherCount = 0;
    try { weatherCount = await WeatherRequest.countDocuments({}); } catch { weatherCount = readWeatherLogs().length; }
    res.json({ ok: true, stats: { users: totalUsers, farmers: farmersCount, general: generalCount, weatherRequests: weatherCount } });
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/admin/weather/logs", async (req, res) => {
  try {
    const logs = await WeatherRequest.find({}, { _id: 0 }).sort({ createdAt: -1 }).limit(500).lean();
    res.json({ ok: true, logs });
  } catch (e) {
    const logs = readWeatherLogs();
    res.json({ ok: true, logs });
  }
});

app.post("/api/weather/request", async (req, res) => {
  try {
    const { email, role, location, temperature, humidity, wind, pressure, condition } = req.body || {};
    const obj = {
      email: email || "",
      role: role || "",
      location: location || "",
      temperature: temperature || "",
      humidity: humidity || "",
      wind: wind || "",
      pressure: pressure || "",
      condition: condition || ""
    };
    try {
      await WeatherRequest.create(obj);
      res.json({ ok: true });
    } catch (e) {
      appendWeatherLog(obj);
      res.json({ ok: true, offline: true });
    }
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/kiosk/exit", async (req, res) => {
  try {
    const port = process.env.PORT || 4000;
    const url = "http://localhost:" + port + "/";
    const edgeCmd = 'start msedge "' + url + '" --no-first-run --fast-start';
    exec(edgeCmd, (err) => {
      if (err) {
        const chromeCmd = 'start chrome "' + url + '" --new-window --no-first-run --fast-start';
        exec(chromeCmd, () => {});
      }
    });
    res.json({ ok: true });
  } catch (e) {
    res.json({ ok: false });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log("🚀 Server running on port " + PORT);
  const auto = String(process.env.NO_AUTO_OPEN || "").trim() !== "1";
  if (auto && process.platform === "win32") {
    const url = "http://localhost:" + PORT + "/";
    setTimeout(() => {
      const edge = 'start msedge --kiosk "' + url + '" --edge-kiosk-type=fullscreen --no-first-run --fast-start';
      exec(edge, (err) => {
        if (err) {
          const chrome = 'start chrome --app="' + url + '" --new-window --start-fullscreen --no-first-run --fast-start';
          exec(chrome, () => {});
        }
      });
    }, 500);
  }
});

