const SORT_MAP = {
  popular: { rating: -1, reviews: -1 },
  newest: { createdAt: -1 },
  "price-low": { price: 1 },
  "price-high": { price: -1 },
  "discount-high": { discount: -1 }
}

module.exports = SORT_MAP
