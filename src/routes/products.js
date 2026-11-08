const express = require('express');
const router = express.Router();
const authGuard = require('../middleware/auth');
const { db } = require('../firebase');

// PUBLIC ROUTE
router.get('/public', async (req, res) => {
  try {
    const snapshot = await db.collection('ledgerProducts').get();
    const products = [];
    snapshot.forEach(doc => {
      products.push({ id: doc.id, ...doc.data() });
    });
    res.json({ message: "Success", data: products });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET: Saare products
router.get('/', authGuard, async (req, res) => {
  try {
    const snapshot = await db.collection('ledgerProducts')
                           .where('orgId', '==', req.user.orgId)
                           .get();
    const products = [];
    snapshot.forEach(doc => {
      products.push({ id: doc.id, ...doc.data() });
    });
    res.json({ message: "Success", data: products });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST: Naya Product
router.post('/', authGuard, async (req, res) => {
  const { name, sku, costPrice, sellingPrice, stock, imageUrl } = req.body;
  
  if (!name || !sku) {
    return res.status(400).json({ error: "Name aur SKU likhna zaroori hai!" });
  }

  try {
    const existingSku = await db.collection('ledgerProducts')
                              .where('orgId', '==', req.user.orgId)
                              .where('sku', '==', sku)
                              .get();

    if (!existingSku.empty) {
      return res.status(400).json({ error: "Yeh SKU pehle se mojood hai!" });
    }

    const newProduct = {
      orgId: req.user.orgId,
      name: name,
      sku: sku,
      costPrice: Number(costPrice) || 0,       // Khareedne ka rate
      sellingPrice: Number(sellingPrice) || 0, // Bechne ka rate
      price: Number(sellingPrice) || 0,        // Customer store ke liye
      stock: Number(stock) || 0,
      imageUrl: imageUrl || '',
      createdAt: new Date().toISOString()
    };

    const docRef = await db.collection('ledgerProducts').add(newProduct);
    res.status(201).json({ message: "Product Added!", data: { id: docRef.id, ...newProduct } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE
router.delete('/:id', authGuard, async (req, res) => {
  try {
    await db.collection('ledgerProducts').doc(req.params.id).delete();
    res.json({ message: "Product Deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;