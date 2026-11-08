const express = require('express');
const router = express.Router();
const authGuard = require('../middleware/auth');
const { db } = require('../firebase');

// POST: Nayi Sale
router.post('/', authGuard, async (req, res) => {
  const { items, paymentStatus } = req.body; 
  if (!items || items.length === 0) return res.status(400).json({ error: "Koi item nahi hai!" });

  try {
    let calculatedTotal = 0;
    let validatedItems = [];

    for (const item of items) {
      const productRef = db.collection('ledgerProducts').doc(item.productId);
      const productDoc = await productRef.get();

      if (!productDoc.exists || productDoc.data().orgId !== req.user.orgId) {
        return res.status(404).json({ error: `Product ID nahi mila` });
      }

      const product = productDoc.data();
      if (product.stock < item.qty) {
        return res.status(400).json({ error: `Stock kam hai ${product.name} ke liye` });
      }

      // Profit calculation ke liye cost aur selling price save kar rahe hain
      const itemTotal = product.sellingPrice * item.qty;
      calculatedTotal += itemTotal;

      validatedItems.push({
        productId: item.productId,
        name: product.name,
        qty: item.qty,
        costAtSale: product.costPrice,      // Khareedne ka rate
        priceAtSale: product.sellingPrice,  // Bechne ka rate
        itemTotal: itemTotal
      });
    }

    const newSale = {
      orgId: req.user.orgId,
      items: validatedItems,
      totalAmount: calculatedTotal,
      paymentStatus: paymentStatus || 'pending',
      date: new Date().toISOString()
    };

    const saleRef = await db.collection('ledgerSales').add(newSale);

    // Stock kam karo
    for (const item of validatedItems) {
      const productRef = db.collection('ledgerProducts').doc(item.productId);
      const doc = await productRef.get();
      await productRef.update({ stock: doc.data().stock - item.qty });
    }

    res.status(201).json({ message: "Sale Completed!", data: { id: saleRef.id, ...newSale } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET: Saari Sales
router.get('/', authGuard, async (req, res) => {
  try {
    const snapshot = await db.collection('ledgerSales').where('orgId', '==', req.user.orgId).get();
    const sales = [];
    snapshot.forEach(doc => sales.push({ id: doc.id, ...doc.data() }));
    res.json({ message: "Success", data: sales });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT: Mark Paid/Unpaid
router.put('/:id/status', authGuard, async (req, res) => {
  const { status } = req.body; 
  if (!['paid', 'pending'].includes(status)) return res.status(400).json({ error: "Invalid status" });

  try {
    const saleRef = db.collection('ledgerSales').doc(req.params.id);
    const doc = await saleRef.get();
    if (!doc.exists || doc.data().orgId !== req.user.orgId) return res.status(404).json({ error: "Not found" });

    await saleRef.update({ paymentStatus: status });
    res.json({ message: `Marked as ${status}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;