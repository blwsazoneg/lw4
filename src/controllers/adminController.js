// src/controllers/adminController.js
import pool from "../config/db.js";

export const getDashboardStats = async (req, res) => {
  try {
    const [userCountsRes, orderStatsRes, recentOrdersRes] = await Promise.all([
      // Query 1: User counts (this is correct)
      pool.query(`
                SELECT 
                    COUNT(*) AS total,
                    COUNT(*) FILTER (WHERE role = 'admin') AS admins,
                    COUNT(*) FILTER (WHERE role = 'employer') AS employers,
                    COUNT(*) FILTER (WHERE role = 'user') AS users
                FROM users;
            `),
      // Query 2: Sales stats (CORRECTED)
      pool.query(`
                SELECT 
                    -- THE FIX: Wrap SUM() in COALESCE() to default NULL to 0.
                    COALESCE(SUM(total_amount), 0) AS total_revenue,
                    COUNT(*) AS total_orders,
                    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as orders_today
                FROM orders;
            `),
      // Query 3: Recent orders (this is correct)
      pool.query(`
                SELECT o.id, o.order_number, o.total_amount, u.first_name, u.last_name
                FROM orders o
                LEFT JOIN users u ON o.user_id = u.id
                ORDER BY o.created_at DESC
                LIMIT 5;
            `),
    ]);

    const stats = {
      userCounts: {
        total: parseInt(userCountsRes.rows[0].total, 10),
        admins: parseInt(userCountsRes.rows[0].admins, 10),
        employers: parseInt(userCountsRes.rows[0].employers, 10),
        users: parseInt(userCountsRes.rows[0].users, 10),
      },
      orderStats: {
        // This parseFloat is now safer because the value will never be null.
        totalRevenue: parseFloat(orderStatsRes.rows[0].total_revenue),
        totalOrders: parseInt(orderStatsRes.rows[0].total_orders, 10),
        ordersToday: parseInt(orderStatsRes.rows[0].orders_today, 10),
      },
      recentOrders: recentOrdersRes.rows,
    };

    res.status(200).json(stats);
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching dashboard stats." });
  }
};
