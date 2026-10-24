const express = require('express');
const router = express.Router();
const authGuard = require('../middleware/auth');
const { db } = require('../firebase');

// 1. POST: Nayi Sale (Bikri) add karo
router.post('/', authGuard, async (req, res) => {
  // Client sirf productId aur quantity bhejega, price nahi!
  const { items, paymentStatus } = req.body; 
  // items ka format: [{ "productId": "abc123", "qty": 2 }]

  if (!items || items.length === 0) {
    return res.status(400).json({ error: "Sale mein kam az kam ek item hona chahiye!" });
  }

  try {
    let calculatedTotal = 0;
    let validatedItems = [];

    // Har item ko check karo
    for (const item of items) {
      const productRef = db.collection('ledgerProducts').doc(item.productId);
      const productDoc = await productRef.get();

      if (!productDoc.exists || productDoc.data().orgId !== req.user.orgId) {
        return res.status(404).json({ error: `Product ID ${item.productId} nahi mila` });
      }

      const product = productDoc.data();
      
      if (product.stock < item.qty) {
        return res.status(400).json({ error: `Stock kam hai ${product.name} ke liye` });
      }

      // Server khud price calculate kar raha hai
      const itemTotal = product.price * item.qty;
      calculatedTotal += itemTotal;

      validatedItems.push({
        productId: item.productId,
        name: product.name,
        qty: item.qty,
        priceAtSale: product.price,
        itemTotal: itemTotal
      });
    }

    // 1. Sale ko database mein save karo
    const newSale = {
      orgId: req.user.orgId,
      items: validatedItems,
      totalAmount: calculatedTotal,
      paymentStatus: paymentStatus || 'paid',
      date: new Date().toISOString()
    };

    const saleRef = await db.collection('ledgerSales').add(newSale);

    // 2. Products ka Stock kam karo
    for (const item of validatedItems) {
      const productRef = db.collection('ledgerProducts').doc(item.productId);
      const doc = await productRef.get();
      await productRef.update({ 
        stock: doc.data().stock - item.qty 
      });
    }

    res.status(201).json({ 
      message: "Sale Completed & Stock Updated!", 
      data: { id: saleRef.id, ...newSale } 
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. GET: Saari Sales ki list dekho
router.get('/', authGuard, async (req, res) => {
  try {
    const snapshot = await db.collection('ledgerSales')
                           .where('orgId', '==', req.user.orgId)
                           .get();
    
    const sales = [];
    snapshot.forEach(doc => {
      sales.push({ id: doc.id, ...doc.data() });
    });

    res.json({ message: "Success", data: sales });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;