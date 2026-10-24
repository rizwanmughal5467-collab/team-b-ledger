const express = require('express');
const router = express.Router();
const authGuard = require('../middleware/auth');
const { db } = require('../firebase');

// GET: Financial Summary (Hisaab ka khulasa)
router.get('/', authGuard, async (req, res) => {
  try {
    const orgId = req.user.orgId;

    // 1. Saari Sales nikaalo
    const salesSnapshot = await db.collection('ledgerSales').where('orgId', '==', orgId).get();
    let totalSales = 0;
    let outstandingPayments = 0; // Pending payments

    salesSnapshot.forEach(doc => {
      const sale = doc.data();
      totalSales += sale.totalAmount || 0;
      if (sale.paymentStatus === 'pending') {
        outstandingPayments += sale.totalAmount || 0;
      }
    });

    // 2. Saari Purchases nikaalo
    const purchasesSnapshot = await db.collection('ledgerPurchases').where('orgId', '==', orgId).get();
    let totalPurchases = 0;
    purchasesSnapshot.forEach(doc => {
      const purchase = doc.data();
      totalPurchases += purchase.totalCost || 0;
    });

    // 3. Low Stock Items nikaalo (Jin ka stock 10 se kam hai)
    const productsSnapshot = await db.collection('ledgerProducts').where('orgId', '==', orgId).get();
    let lowStockCount = 0;
    let totalProducts = 0;
    let lowStockProducts = [];

    productsSnapshot.forEach(doc => {
      totalProducts++;
      const product = doc.data();
      if (product.stock <= 10) {
        lowStockCount++;
        lowStockProducts.push({ name: product.name, stock: product.stock });
      }
    });

    // Result bhejo
    res.json({
      message: "Summary Generated Successfully",
      data: {
        totalSales: totalSales,
        totalPurchases: totalPurchases,
        outstandingPayments: outstandingPayments,
        totalProducts: totalProducts,
        lowStockCount: lowStockCount,
        lowStockProducts: lowStockProducts
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;