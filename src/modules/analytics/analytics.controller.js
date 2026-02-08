const Order = require("../order/order.model");
const User = require("../user/user.model");
const Product = require("../product/product.model");

// Get analytics data for admin dashboard
async function getAnalytics(req, res) {
  try {
    const { dateRange = 'month' } = req.query;
    
    // Calculate date ranges
    const now = new Date();
    let startDate, previousStartDate;
    
    switch (dateRange) {
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        previousStartDate = new Date(startDate);
        previousStartDate.setDate(previousStartDate.getDate() - 7);
        previousStartDate.setHours(0, 0, 0, 0);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        previousStartDate = new Date(now.getFullYear() - 1, 0, 1);
        break;
      case 'month':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        break;
    }

    const previousEndDate = new Date(startDate);

    // Total Revenue (current period)
    const currentRevenueResult = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          paymentStatus: "PAID",
          orderStatus: { $ne: "CANCELLED" }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$totalAmount" }
        }
      }
    ]);
    const totalRevenue = currentRevenueResult[0]?.total || 0;

    // Previous period revenue
    const previousRevenueResult = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: previousStartDate, $lt: previousEndDate },
          paymentStatus: "PAID",
          orderStatus: { $ne: "CANCELLED" }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$totalAmount" }
        }
      }
    ]);
    const previousRevenue = previousRevenueResult[0]?.total || 0;
    const revenueChange = previousRevenue > 0 
      ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 
      : (totalRevenue > 0 ? 100 : 0);

    // Total Orders (current period)
    const currentOrdersCount = await Order.countDocuments({
      createdAt: { $gte: startDate }
    });

    // Previous period orders
    const previousOrdersCount = await Order.countDocuments({
      createdAt: { $gte: previousStartDate, $lt: previousEndDate }
    });
    const ordersChange = previousOrdersCount > 0
      ? ((currentOrdersCount - previousOrdersCount) / previousOrdersCount) * 100
      : (currentOrdersCount > 0 ? 100 : 0);

    // Average Order Value
    const avgOrderValue = currentOrdersCount > 0 
      ? totalRevenue / currentOrdersCount 
      : 0;

    const previousAvgOrderValue = previousOrdersCount > 0
      ? previousRevenue / previousOrdersCount
      : 0;
    const avgOrderValueChange = previousAvgOrderValue > 0
      ? ((avgOrderValue - previousAvgOrderValue) / previousAvgOrderValue) * 100
      : (avgOrderValue > 0 ? 100 : 0);

    // New Customers (current period)
    const currentNewCustomers = await User.countDocuments({
      createdAt: { $gte: startDate }
    });

    // Previous period new customers
    const previousNewCustomers = await User.countDocuments({
      createdAt: { $gte: previousStartDate, $lt: previousEndDate }
    });
    const customersChange = previousNewCustomers > 0
      ? ((currentNewCustomers - previousNewCustomers) / previousNewCustomers) * 100
      : (currentNewCustomers > 0 ? 100 : 0);

    // Revenue trend data (last 7 months or 7 weeks)
    const revenueTrend = [];
    const trendPeriods = dateRange === 'year' ? 12 : dateRange === 'week' ? 7 : 6;
    const trendInterval = dateRange === 'year' ? 'month' : dateRange === 'week' ? 'day' : 'month';

    for (let i = trendPeriods - 1; i >= 0; i--) {
      let periodStart, periodEnd;
      
      if (trendInterval === 'month') {
        periodStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        periodEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      } else {
        periodStart = new Date(now);
        periodStart.setDate(now.getDate() - i);
        periodStart.setHours(0, 0, 0, 0);
        periodEnd = new Date(periodStart);
        periodEnd.setDate(periodEnd.getDate() + 1);
        periodEnd.setHours(0, 0, 0, 0);
      }

      const periodRevenue = await Order.aggregate([
        {
          $match: {
            createdAt: { $gte: periodStart, $lt: periodEnd },
            paymentStatus: "PAID",
            orderStatus: { $ne: "CANCELLED" }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$totalAmount" }
          }
        }
      ]);

      const revenue = periodRevenue[0]?.total || 0;
      
      let label;
      if (trendInterval === 'month') {
        label = periodStart.toLocaleDateString('en-US', { month: 'short' });
      } else {
        label = periodStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }

      revenueTrend.push({
        label,
        value: revenue,
        display: `₹${(revenue / 1000).toFixed(0)}k`
      });
    }

    // Category distribution (top categories by revenue)
    const categoryDistribution = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          paymentStatus: "PAID",
          orderStatus: { $ne: "CANCELLED" }
        }
      },
      {
        $unwind: "$items"
      },
      {
        $lookup: {
          from: "products",
          localField: "items.productId",
          foreignField: "_id",
          as: "product"
        }
      },
      {
        $unwind: "$product"
      },
      {
        $group: {
          _id: "$product.category",
          revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
          orders: { $sum: 1 }
        }
      },
      {
        $sort: { revenue: -1 }
      },
      {
        $limit: 10
      }
    ]);

    // Payment method distribution
    const paymentMethodDistribution = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: "$paymentMethod",
          count: { $sum: 1 },
          revenue: { $sum: "$totalAmount" }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        kpis: {
          totalRevenue: {
            value: totalRevenue,
            display: `₹${(totalRevenue / 1000).toFixed(0)}k`,
            change: revenueChange,
            isPositive: revenueChange >= 0
          },
          orders: {
            value: currentOrdersCount,
            display: currentOrdersCount.toLocaleString(),
            change: ordersChange,
            isPositive: ordersChange >= 0
          },
          avgOrderValue: {
            value: avgOrderValue,
            display: `₹${Math.round(avgOrderValue)}`,
            change: avgOrderValueChange,
            isPositive: avgOrderValueChange >= 0
          },
          newCustomers: {
            value: currentNewCustomers,
            display: currentNewCustomers.toLocaleString(),
            change: customersChange,
            isPositive: customersChange >= 0
          }
        },
        revenueTrend,
        categoryDistribution: categoryDistribution.map(item => ({
          category: item._id || 'Uncategorized',
          revenue: item.revenue,
          orders: item.orders
        })),
        paymentMethodDistribution: paymentMethodDistribution.map(item => ({
          method: item._id || 'Unknown',
          count: item.count,
          revenue: item.revenue
        })),
        dateRange
      }
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch analytics"
    });
  }
}

module.exports = {
  getAnalytics
};
