const express = require('express');
const router = express.Router();
const authGuard = require('../middleware/auth');

// Abhi ke liye temporary memory
let products = [];

// GET: Saare products dekho
router.get('/', authGuard, (req, res) => {
  res.json({ message: "Success", data: products });
});

// POST: Naya product add karo
router.post('/', authGuard, (req, res) => {
  const { name, sku, price, stock } = req.body;
  if (!name || !sku) return res.status(400).json({ error: "Name aur SKU zaroori hai!" });

  const newProduct = { id: Date.now().toString(), name, sku, price: price || 0, stock: stock || 0 };
  products.push(newProduct);
  res.status(201).json({ message: "Product Added!", data: newProduct });
});

module.exports = router;