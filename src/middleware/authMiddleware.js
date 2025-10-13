export const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    res.status(401).json({ message: "Unauthorized. Please log in." });
  }
};

export const isAdmin = (req, res, next) => {
  if (req.session.user && req.session.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ message: "Forbidden. Admins only." });
  }
};

// --- NEW: Middleware to protect the entire /admin area ---
export const isAdminRoute = (req, res, next) => {
  if (req.session.user && req.session.user.role === "admin") {
    // If user is an admin, proceed.
    next();
  } else {
    // If not an admin, redirect them to the admin login page.
    res.redirect("/admin/login");
  }
};
