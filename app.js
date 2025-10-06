import express from "express";
import engine from "ejs-mate";
import dotenv from "dotenv";
import pool from "./src/config/db.js";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";

import innovationRoutes from "./src/routes/innovationRoutes.js";
import companyRoutes from "./src/routes/companyRoutes.js";
import jobRoutes from "./src/routes/jobRoutes.js";
import jobApplicationRoutes from "./src/routes/jobApplicationRoutes.js";
import authRoutes from "./src/routes/authRoutes.js";
import brandRoutes from "./src/routes/brandRoutes.js";
import productRoutes from "./src/routes/productRoutes.js";
import cartRoutes from "./src/routes/cartRoutes.js";
import orderRoutes from "./src/routes/orderRoutes.js";
import profileRoutes from "./src/routes/profileRoutes.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// --- Use ejs-mate for layouts ---
app.engine("ejs", engine); // <-- SET the engine
app.set("view engine", "ejs");
app.set("views", "views"); // Explicitly set the views directory

const PgSession = connectPgSimple(session);
app.use(
  session({
    store: new PgSession({
      pool: pool,
      tableName: "session",
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 }, // 30 days
    httpOnly: true,
  })
);

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.json());

const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY;

// --- NEW GLOBAL TEMPLATE VARIABLES MIDDLEWARE ---
app.use((req, res, next) => {
  // Add variables that should be available in ALL EJS templates
  res.locals.STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY;
  res.locals.user = req.session.user || null;
  next(); // Move on to the next middleware or route
});

app.get("/", (req, res) => {
  res.render("pages/home", { pageTitle: "Welcome to the Platform" });
});

app.get("/shop", (req, res) => {
  res.render("pages/shop", { pageTitle: "Shop" });
});

app.get("/jobs", (req, res) => {
  res.render("pages/jobs", { pageTitle: "Work at an SBO" });
});

app.get("/jobs/:id", (req, res) => {
  res.render("pages/job-detail", {
    pageTitle: "Job Details",
    jobId: req.params.id,
  });
});

app.get("/innovate", (req, res) => {
  // REMOVED the redirect logic.
  // Always render the page, and pass the user object (or null).
  res.render("pages/innovate", {
    pageTitle: "Submit an Idea or Innovation",
    user: req.session.user || null,
  });
});

// This is the primary route for creating/editing a profile.
app.get("/profile/create", (req, res) => {
  res.render("pages/create-profile", {
    pageTitle: "Create Your Profile",
    user: req.session.user || null,
  });
});

// --- THE FIX ---
// Add a new route for /profile/new that renders the same page.
// This handles the user flow we designed.
app.get("/profile/new", (req, res) => {
  res.render("pages/create-profile", {
    pageTitle: "Create Your Profile",
    user: req.session.user || null,
  });
});

// This redirect is still good to have for consistency.
app.get("/profile/edit", (req, res) => {
  res.redirect("/profile/create");
});

// CART PAGE (Already has it, but let's ensure it's consistent)
app.get("/cart", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/profile/new");
  }
  res.render("pages/cart", { pageTitle: "Your Shopping Cart" });
});

app.get("/products/:id", (req, res) => {
  // We pass the productId from the URL so our Alpine component knows which product to fetch.
  res.render("pages/product-detail", {
    pageTitle: "Product Details", // We can update this dynamically later
    user: res.locals.user, // res.locals is the best practice
    productId: req.params.id,
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/innovations", innovationRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/applications", jobApplicationRoutes);

app.use("/api/brands", brandRoutes);
app.use("/api/products", productRoutes);

app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);

app.use("/api/profile", profileRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
