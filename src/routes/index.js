const router = require("express").Router()
const vendorRoutes = require("../modules/vendors/vendors.routes")
const productRoutes = require("../modules/product/product.routes")

router.get("/health", (_, res) => {
  res.json({ status: "OK" })
})


const reassignAllProducts = require("../jobs/reassignProducts.job")

router.post("/admin/reassign-products", async (_, res) => {
  await reassignAllProducts()
  res.json({ message: "Reassignment completed" })
})

router.use("/products", productRoutes)
router.use("/vendors", vendorRoutes)
router.use("/shops", require("../modules/shop/shop.routes"))
router.use("/products", require("../modules/product/product.routes"))
router.use("/reviews", require("../modules/review/review.routes"))
router.use("/wishlist", require("../modules/wishlist/wishlist.routes"))
router.use("/cart", require("../modules/cart/cart.routes"))
router.use("/orders", require("../modules/order/order.routes"))
router.use("/auth", require("../modules/auth/auth.routes"))
router.use("/users", require("../modules/user/user.routes"))
router.use("/geocoding", require("../modules/geocoding/geocoding.routes"))
router.use("/categories", require("../modules/category/category.routes"))
router.use("/brands", require("../modules/brand/brand.routes"))
router.use("/payment", require("../modules/payment/payment.routes"))
router.use("/notifications", require("../modules/notification/notification.routes"))
router.use("/upload", require("../modules/upload/upload.routes"))
router.use("/user-admin", require("../modules/userAdmin/userAdmin.routes"))

module.exports = router
