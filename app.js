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
import { isAdminRoute } from "./src/middleware/authMiddleware.js";
import sectorRoutes from "./src/routes/sectorRoutes.js";
import employerRoutes from "./src/routes/employerRoutes.js";
import adminOrderRoutes from "./src/routes/adminOrderRoutes.js";
import adminUserRoutes from "./src/routes/adminUserRoutes.js"; // <-- Import the new router
import adminInnovationRoutes from "./src/routes/adminInnovationRoutes.js";
import adminRoutes from "./src/routes/adminRoutes.js";

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

// --- MIDDLEWARE ---
app.engine("ejs", engine);
app.set("view engine", "ejs");
app.set("views", "views");

// This middleware is for parsing JSON bodies.
app.use(express.json());
// THIS IS LIKELY THE MISSING PIECE for text fields in multipart forms.
app.use(express.urlencoded({ extended: true }));

app.use(express.static("public"));
app.use("/node_modules", express.static("node_modules"));
app.use("/uploads", express.static("uploads"));

const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY;

// --- NEW GLOBAL TEMPLATE VARIABLES MIDDLEWARE ---
app.use((req, res, next) => {
  // Add variables that should be available in ALL EJS templates
  res.locals.STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY;
  res.locals.user = req.session.user || null;
  next(); // Move on to the next middleware or route
});

// Homepage route
app.get("/", (req, res) => {
  res.render("pages/home", {
    pageTitle: "Welcome",
    user: req.session.user || null,
  });
});

// Landing page route
app.get("/landing", (req, res) => {
  res.render("pages/landing", {
    pageTitle: "Welcome",
    user: req.session.user || null,
  });
});

// Explore page route
app.get("/explore", (req, res) => {
  res.render("pages/explore", {
    pageTitle: "Explore the Platform",
    user: req.session.user || null,
  });
});

// This route serves the new "Shop Intro" page.
app.get("/shop-intro", (req, res) => {
  res.render("pages/shop-intro", {
    pageTitle: "Shop Made in Loveworld",
    user: req.session.user || null,
  });
});

// This route serves the new "Placement Intro" page.
app.get("/placement-intro", (req, res) => {
  res.render("pages/placement-intro", {
    pageTitle: "Strategic Company Placement",
    user: req.session.user || null,
  });
});

// This route serves the new "Innovate Intro" page.
app.get("/innovate-intro", (req, res) => {
  res.render("pages/innovate-intro", {
    pageTitle: "Bring Innovations to Life",
    user: req.session.user || null,
  });
});

// This is now the final destination page after the intro sequence.
app.get("/home-main", (req, res) => {
  res.render("pages/home-main", {
    pageTitle: "LW4.0 - Home",
    user: req.session.user || null,
    solidNavbar: true,
  });
});

app.get("/shop", (req, res) => {
  res.render("pages/shop", {
    pageTitle: "Shop made in Loveworld",
    solidNavbar: true,
  });
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

// app.js
app.get("/cart", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/profile/new");
  }
  // We still need to pass the Stripe key
  res.render("pages/cart", {
    pageTitle: "Your Shopping Cart",
    solidNavbar: true,
  });
});

// app.js -> inside the protected /admin area
app.get("/admin/brands", (req, res) => {
  res.render("pages/admin/manage-brands", {
    pageTitle: "Manage Brands",
  });
});

// app.js -> inside the protected /admin area
app.get("/admin/sectors", (req, res) => {
  res.render("pages/admin/manage-sectors", {
    pageTitle: "Manage Sectors",
  });
});

app.get("/products/:id", (req, res) => {
  // We pass the productId from the URL so our Alpine component knows which product to fetch.
  res.render("pages/product-detail", {
    pageTitle: "Product Details", // We can update this dynamically later
    user: res.locals.user, // res.locals is the best practice
    productId: req.params.id,
  });
});

// This route serves the user's order history page.
app.get("/orders", (req, res) => {
  // Protect this page. If not logged in, redirect.
  if (!req.session.user) {
    return res.redirect("/profile/new"); // Redirect to a page with a login button
  }

  res.render("pages/order-history", {
    pageTitle: "Your Orders",
    user: req.session.user,
  });
});

app.get("/orders/:orderId", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/profile/new");
  }
  res.render("pages/order-detail", {
    pageTitle: "Order Details",
    user: req.session.user,
    orderId: req.params.orderId, // Pass the order ID to the page
  });
});

// EMPLOYER SECTION ROUTES

// This route serves the page for new SBOs/Employers to register.
// app.get("/employers/register", (req, res) => {
//   res.render("pages/employer-register", {
//     pageTitle: "Employer Registration",
//     user: req.session.user || null,
//   });
// });

// Middleware to protect employer-specific pages
const isEmployerOrAdmin = (req, res, next) => {
  if (
    req.session.user &&
    (req.session.user.role === "employer" || req.session.user.role === "admin")
  ) {
    next();
  } else {
    res.redirect("/employers/register"); // Or to a generic "access denied" page
  }
};

// The dashboard page, protected by our new middleware
app.get("/employers/dashboard", isEmployerOrAdmin, (req, res) => {
  res.render("pages/employer-dashboard", {
    pageTitle: "Employer Dashboard",
    user: req.session.user,
  });
});

// Serves the page for creating a new job posting.
app.get("/employers/jobs/new", isEmployerOrAdmin, (req, res) => {
  res.render("pages/create-job", {
    pageTitle: "Post a New Job",
    user: req.session.user,
  });
});

// Serves the page for editing the employer's company details.
app.get("/employers/company/edit", isEmployerOrAdmin, (req, res) => {
  res.render("pages/edit-company", {
    pageTitle: "Edit Company Details",
    user: req.session.user,
  });
});

// This route serves the page for viewing applicants for a specific job.
app.get("/employers/jobs/:jobId/applicants", isEmployerOrAdmin, (req, res) => {
  res.render("pages/view-applicants", {
    pageTitle: "View Applicants",
    user: req.session.user,
    jobId: req.params.jobId,
  });
});

// Serves the page for editing an existing job posting.
app.get("/employers/jobs/edit/:id", isEmployerOrAdmin, (req, res) => {
  res.render("pages/edit-job", {
    pageTitle: "Edit Job Posting",
    user: req.session.user,
    jobId: req.params.id, // Pass the job ID to the page
  });
});

// ADMIN PRODUCT MANAGEMENT PAGE

// Serves the admin login page.
app.get("/admin/login", (req, res) => {
  // If an admin is already logged in, redirect them to the dashboard
  if (req.session.user && req.session.user.role === "admin") {
    return res.redirect("/admin");
  }
  res.render("pages/admin/login", {
    pageTitle: "Admin Login",
    user: null, // No user context needed here
  });
});

app.use("/admin", isAdminRoute);

// This route serves the page for editing a specific product.
app.get("/admin/products/edit/:id", (req, res) => {
  res.render("pages/admin/edit-product", {
    pageTitle: "Edit Product",
    user: req.session.user,
    productId: req.params.id, // Pass the product ID to the page
  });
});

// Serves the main admin dashboard.
app.get("/admin", (req, res) => {
  // This page is protected. We'll add middleware for this soon.
  if (!req.session.user || req.session.user.role !== "admin") {
    return res.redirect("/admin/login");
  }
  res.render("pages/admin/dashboard", {
    pageTitle: "Admin Dashboard",
    user: req.session.user,
  });
});

app.get("/admin/products", (req, res) => {
  // Protect this page using middleware logic
  if (!req.session.user || req.session.user.role !== "admin") {
    return res.redirect("/"); // Or show a 403 Forbidden page
  }

  res.render("pages/admin/product-list", {
    pageTitle: "Manage Products",
    user: req.session.user,
  });
});

// This route serves the page for admins to view all orders.
app.get("/admin/orders", (req, res) => {
  res.render("pages/admin/order-list", {
    pageTitle: "Manage Orders",
    user: req.session.user,
  });
});

// This route serves the page for adding a NEW product.
app.get("/admin/products/new", (req, res) => {
  res.render("pages/admin/add-product", {
    pageTitle: "Add New Product",
    user: req.session.user,
  });
});

app.use("/api/admin/orders", isAdminRoute, adminOrderRoutes);
app.use("/api/admin/users", isAdminRoute, adminUserRoutes); // <-- ADD THIS LINE
app.use("/api/admin", isAdminRoute, adminRoutes);

// This route serves the page for admins to view all users.
app.get("/admin/users", (req, res) => {
  res.render("pages/admin/user-list", {
    pageTitle: "Manage Users",
    user: req.session.user,
  });
});

// Create the new page route
app.get("/admin/innovations", isAdminRoute, (req, res) => {
  res.render("pages/admin/innovation-list", {
    pageTitle: "Manage Innovations",
    user: req.session.user,
  });
});

// This route serves the page for an admin to view a single innovation.
app.get("/admin/innovations/:id", (req, res) => {
  res.render("pages/admin/innovation-detail", {
    pageTitle: "Innovation Details",
    user: req.session.user,
    innovationId: req.params.id,
  });
});

// This route serves the page for an admin to view a single order's details.
app.get("/admin/orders/:id", (req, res) => {
  res.render("pages/admin/order-detail", {
    pageTitle: "Order Details",
    user: req.session.user,
    orderId: req.params.id,
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/innovations", innovationRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/applications", jobApplicationRoutes);

app.use("/api/brands", brandRoutes);
app.use("/api/products", productRoutes);
app.use("/api/sectors", sectorRoutes);

app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);

app.use("/api/profile", profileRoutes);
app.use("/api/employers", employerRoutes); // <-- ADD THIS

// Mount the new API route
app.use("/api/admin/innovations", isAdminRoute, adminInnovationRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
