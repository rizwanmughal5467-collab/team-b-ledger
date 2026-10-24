const express = require('express');
const router = express.Router();
const authGuard = require('../middleware/auth');
const { db } = require('../firebase'); // Firebase import kiya

// 1. GET: Saare products Firebase se laao
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

// 2. POST: Naya product Firebase mein save karo
router.post('/', authGuard, async (req, res) => {
  const { name, sku, price, stock } = req.body;
  
  if (!name || !sku) {
    return res.status(400).json({ error: "Name aur SKU likhna zaroori hai!" });
  }

  try {
    // SKU validation: Check karo ke yeh SKU pehle se exist toh nahi karta
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
      price: price || 0,
      stock: stock || 0,
      createdAt: new Date().toISOString()
    };

    const docRef = await db.collection('ledgerProducts').add(newProduct);
    
    res.status(201).json({ 
      message: "Product Added to Database!", 
      data: { id: docRef.id, ...newProduct } 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// 3. PUT: Product ko update karo (Price ya Stock change karna)
router.put('/:id', authGuard, async (req, res) => {
  const { name, price, stock } = req.body;
  try {
    const productRef = db.collection('ledgerProducts').doc(req.params.id);
    const doc = await productRef.get();

    if (!doc.exists || doc.data().orgId !== req.user.orgId) {
      return res.status(404).json({ error: "Product nahi mila" });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (price !== undefined) updateData.price = price;
    if (stock !== undefined) updateData.stock = stock;
    updateData.updatedAt = new Date().toISOString();

    await productRef.update(updateData);
    res.json({ message: "Product Updated!", data: updateData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. DELETE: Product ko delete karo
router.delete('/:id', authGuard, async (req, res) => {
  try {
    const productRef = db.collection('ledgerProducts').doc(req.params.id);
    const doc = await productRef.get();

    if (!doc.exists || doc.data().orgId !== req.user.orgId) {
      return res.status(404).json({ error: "Product nahi mila" });
    }

    await productRef.delete();
    res.json({ message: "Product Deleted from Database" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;