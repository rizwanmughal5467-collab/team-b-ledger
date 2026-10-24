const express = require('express');
const cors = require('cors');
require('dotenv').config();

const productRoutes = require('./routes/products');
const salesRoutes = require('./routes/sales');
const purchaseRoutes= require('./routes/purchases');
const summaryRoutes = require('./routes/summaries');


const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {ase
  res.json({ ok: true, message: 'Team B Ledger Backend is running!' });
});

// Products API ka rasta
app.use('/api/ledger/products', productRoutes);
app.use('/api/ledger/sales', salesRoutes);
app.use('/api/ledger/purchases', purchaseRoutes);
app.use('/api/ledger/summary', summaryRoutes);


const PORT = process.env.PORT || 4001; // Dhyan dein: Team B ke liye Port 4001 rakha hai taake Team A se na takraye
app.listen(PORT, () => {
  console.log(`\n✅ Team B Server running on http://localhost:${PORT}`);
});