const User = require("./user.model");
const Order = require("../order/order.model");

// Get user statistics
async function getUserStats(req, res) {
  try {
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Active users (users with isActive: true)
    const activeUsers = await User.countDocuments({ isActive: true });

    // Users registered in current month
    const currentMonthUsers = await User.countDocuments({
      createdAt: { $gte: startOfCurrentMonth }
    });

    // Users registered in last month
    const lastMonthUsers = await User.countDocuments({
      createdAt: { 
        $gte: startOfLastMonth,
        $lt: startOfCurrentMonth
      }
    });

    // Calculate percentage change
    let percentChange = 0;
    if (lastMonthUsers > 0) {
      percentChange = ((currentMonthUsers - lastMonthUsers) / lastMonthUsers) * 100;
    } else if (currentMonthUsers > 0) {
      percentChange = 100; // 100% increase if no users last month
    }

    res.json({
      success: true,
      data: {
        activeUsers,
        currentMonthUsers,
        lastMonthUsers,
        percentChange: Math.round(percentChange * 100) / 100 // Round to 2 decimal places
      }
    });
  } catch (error) {
    console.error("Error fetching user stats:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch user statistics"
    });
  }
}

// Get paginated users list
async function getUsersList(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get total count for pagination
    const totalUsers = await User.countDocuments({});

    // Get users with pagination
    const users = await User.find({})
      .select("name email phone avatar isActive isProfileComplete createdAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get order counts for each user
    const userIds = users.map(user => user._id);
    const orderCounts = await Order.aggregate([
      {
        $match: {
          userId: { $in: userIds }
        }
      },
      {
        $group: {
          _id: "$userId",
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: "$totalAmount" }
        }
      }
    ]);

    // Create a map for quick lookup
    const orderMap = {};
    orderCounts.forEach(item => {
      orderMap[item._id.toString()] = {
        totalOrders: item.totalOrders,
        totalRevenue: item.totalRevenue
      };
    });

    // Add order stats to each user
    const usersWithStats = users.map(user => ({
      ...user,
      totalOrders: orderMap[user._id.toString()]?.totalOrders || 0,
      totalRevenue: orderMap[user._id.toString()]?.totalRevenue || 0
    }));

    res.json({
      success: true,
      data: {
        users: usersWithStats,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalUsers / limit),
          totalUsers,
          limit
        }
      }
    });
  } catch (error) {
    console.error("Error fetching users list:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch users list"
    });
  }
}

// Get detailed user information with revenue
async function getUserDetails(req, res) {
  try {
    const userId = req.params.id;

    // Get user details
    const user = await User.findById(userId).lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Get all orders for this user
    const orders = await Order.find({ userId })
      .populate("items.productId", "name slug images price")
      .sort({ createdAt: -1 })
      .lean();

    // Calculate revenue statistics
    const totalRevenue = orders.reduce((sum, order) => {
      if (order.paymentStatus === "PAID" && order.orderStatus !== "CANCELLED") {
        return sum + (order.totalAmount || 0);
      }
      return sum;
    }, 0);

    const totalOrders = orders.length;
    const completedOrders = orders.filter(
      order => order.orderStatus === "DELIVERED" || order.orderStatus === "COMPLETED"
    ).length;
    const pendingOrders = orders.filter(
      order => order.orderStatus === "PLACED" || order.orderStatus === "CONFIRMED"
    ).length;
    const cancelledOrders = orders.filter(
      order => order.orderStatus === "CANCELLED"
    ).length;

    // Calculate average order value
    const paidOrders = orders.filter(
      order => order.paymentStatus === "PAID" && order.orderStatus !== "CANCELLED"
    );
    const averageOrderValue = paidOrders.length > 0
      ? totalRevenue / paidOrders.length
      : 0;

    // Get last order date
    const lastOrder = orders.length > 0 ? orders[0] : null;

    res.json({
      success: true,
      data: {
        user: {
          ...user,
          // Remove sensitive data if needed
        },
        revenue: {
          totalRevenue,
          totalOrders,
          completedOrders,
          pendingOrders,
          cancelledOrders,
          averageOrderValue: Math.round(averageOrderValue * 100) / 100,
          lastOrderDate: lastOrder ? lastOrder.createdAt : null
        },
        orders: orders.map(order => ({
          _id: order._id,
          orderStatus: order.orderStatus,
          paymentStatus: order.paymentStatus,
          paymentMethod: order.paymentMethod,
          totalAmount: order.totalAmount,
          items: order.items,
          createdAt: order.createdAt,
          deliveryAddress: order.deliveryAddress
        }))
      }
    });
  } catch (error) {
    console.error("Error fetching user details:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch user details"
    });
  }
}

// Delete user
async function deleteUser(req, res) {
  try {
    const userId = req.params.id;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Delete all orders associated with this user
    const orderCount = await Order.countDocuments({ userId });
    if (orderCount > 0) {
      await Order.deleteMany({ userId });
      console.log(`Deleted ${orderCount} order(s) for user ${userId}`);
    }

    // Delete the user
    await User.findByIdAndDelete(userId);

    res.json({
      success: true,
      message: `User and ${orderCount} associated order(s) deleted successfully`
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete user"
    });
  }
}

module.exports = {
  getUserStats,
  getUsersList,
  getUserDetails,
  deleteUser
};
