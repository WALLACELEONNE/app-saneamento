const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 7700;

// Configurar CORS
app.use(cors({
  origin: ['http://localhost:8877', 'http://127.0.0.1:8877'],
  credentials: true
}));

app.use(express.json());

// Mock data
const mockEmpresas = [
  { id: '1', nome: 'Empresa A' },
  { id: '2', nome: 'Empresa B' },
  { id: '3', nome: 'Empresa C' }
];

const mockGrupos = [
  { id: '1', nome: 'Grupo 1', empresa_id: '1' },
  { id: '2', nome: 'Grupo 2', empresa_id: '1' },
  { id: '3', nome: 'Grupo 3', empresa_id: '2' }
];

const mockSubgrupos = [
  { id: '1', nome: 'Subgrupo 1', grupo_id: '1' },
  { id: '2', nome: 'Subgrupo 2', grupo_id: '1' },
  { id: '3', nome: 'Subgrupo 3', grupo_id: '2' }
];

const mockProdutos = [
  { id: '1', nome: 'Produto 1', codigo: 'P001', empresa_id: '1' },
  { id: '2', nome: 'Produto 2', codigo: 'P002', empresa_id: '1' },
  { id: '3', nome: 'Produto 3', codigo: 'P003', empresa_id: '2' }
];

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Mock backend is running' });
});

app.get('/api/v1/filters/empresas', (req, res) => {
  res.json({
    success: true,
    data: mockEmpresas,
    total: mockEmpresas.length
  });
});

app.get('/api/v1/filters/grupos', (req, res) => {
  const empresaId = req.query.empresa_id;
  let grupos = mockGrupos;
  
  if (empresaId) {
    grupos = mockGrupos.filter(g => g.empresa_id === empresaId);
  }
  
  res.json({
    success: true,
    data: grupos,
    total: grupos.length
  });
});

app.get('/api/v1/filters/subgrupos', (req, res) => {
  const grupoId = req.query.grupo_id;
  let subgrupos = mockSubgrupos;
  
  if (grupoId) {
    subgrupos = mockSubgrupos.filter(s => s.grupo_id === grupoId);
  }
  
  res.json({
    success: true,
    data: subgrupos,
    total: subgrupos.length
  });
});

app.get('/api/v1/filters/produtos', (req, res) => {
  const empresaId = req.query.empresa_id;
  let produtos = mockProdutos;
  
  if (empresaId) {
    produtos = mockProdutos.filter(p => p.empresa_id === empresaId);
  }
  
  res.json({
    success: true,
    data: produtos,
    total: produtos.length
  });
});

app.get('/api/v1/estoque', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: '1',
        produto: 'Produto 1',
        codigo: 'P001',
        estoque_siagri: 100,
        estoque_cigam: 95,
        divergencia: 5,
        empresa: 'Empresa A'
      },
      {
        id: '2',
        produto: 'Produto 2',
        codigo: 'P002',
        estoque_siagri: 50,
        estoque_cigam: 50,
        divergencia: 0,
        empresa: 'Empresa A'
      }
    ],
    total: 2,
    page: 1,
    per_page: 50
  });
});

app.listen(PORT, () => {
  console.log(`Mock backend rodando na porta ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});