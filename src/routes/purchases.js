const express = require('express');
const router = express.Router();
const authGuard = require('../middleware/auth');
const { db } = require('../firebase');

// 1. POST: Naya Purchase (Maal kharidna) aur Stock barhana
router.post('/', authGuard, async (req, res) => {
  const { productId, qty, supplier } = req.body;

  if (!productId || !qty || qty <= 0) {
    return res.status(400).json({ error: "Product ID aur sahi Quantity zaroori hai!" });
  }

  try {
    const productRef = db.collection('ledgerProducts').doc(productId);
    
    // Firestore Transaction shuru karein (Atomic operation)
    await db.runTransaction(async (t) => {
      const productDoc = await t.get(productRef);

      if (!productDoc.exists || productDoc.data().orgId !== req.user.orgId) {
        throw new Error("Product nahi mila ya aapka nahi hai");
      }

      const productData = productDoc.data();
      const newStock = productData.stock + qty;

      // 1. Product ka stock update karo
      t.update(productRef, { stock: newStock });

      // 2. Purchase ka record banao
      const purchaseRef = db.collection('ledgerPurchases').doc();
      t.set(purchaseRef, {
        orgId: req.user.orgId,
        productId: productId,
        productName: productData.name,
        qty: qty,
        costPerItem: productData.price, // Abhi ke liye same price, baad mein cost add kar sakte hain
        totalCost: productData.price * qty,
        supplier: supplier || 'Unknown',
        date: new Date().toISOString()
      });

      // 3. Stock Movement ka record banao (Log)
      const movementRef = db.collection('ledgerStockMovements').doc();
      t.set(movementRef, {
        orgId: req.user.orgId,
        productId: productId,
        type: 'purchase', // 'purchase' ya 'sale'
        qty: qty,
        previousStock: productData.stock,
        newStock: newStock,
        date: new Date().toISOString()
      });
    });

    res.status(201).json({ message: "Purchase Successful! Stock Updated." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. GET: Saare Purchases dekho
router.get('/', authGuard, async (req, res) => {
  try {
    const snapshot = await db.collection('ledgerPurchases')
                           .where('orgId', '==', req.user.orgId)
                           .get();
    const purchases = [];
    snapshot.forEach(doc => purchases.push({ id: doc.id, ...doc.data() }));
    res.json({ message: "Success", data: purchases });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;