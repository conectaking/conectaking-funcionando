const express = require('express');
const router = express.Router();
const { protectFinance } = require('../../middleware/protectFinance');
const controller = require('./finance.controller');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configurar multer para upload de anexos
const uploadDir = path.join(__dirname, '../../uploads/finance');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
    dest: uploadDir,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Tipo de arquivo não permitido. Use JPEG, PNG ou PDF'), false);
        }
    }
});

// Todas as rotas requerem autenticação
router.use(protectFinance);

// Dashboard
router.get('/dashboard', controller.getDashboard);

// Transações
router.get('/transactions', controller.getTransactions);
router.get('/transactions/:id', controller.getTransaction);
router.post('/transactions', controller.createTransaction);
router.put('/transactions/:id', controller.updateTransaction);
router.delete('/transactions/:id', controller.deleteTransaction);

// Categorias
router.get('/categories', controller.getCategories);
router.post('/categories', controller.createCategory);

// Contas
router.get('/accounts', controller.getAccounts);
router.post('/accounts', controller.createAccount);

// Cartões
router.get('/cards', controller.getCards);
router.post('/cards', controller.createCard);

// Orçamentos
router.get('/budgets', controller.getBudgets);
router.post('/budgets', controller.createBudget);

// Relatórios
router.get('/reports/summary', controller.getSummaryReport);
router.get('/reports/categories', controller.getCategoriesReport);

// Transferências
router.post('/transfer', controller.transferBetweenAccounts);

// Upload
router.post('/upload', upload.single('file'), controller.uploadAttachment);

// Perfis Financeiros
// IMPORTANTE: Rotas específicas devem vir ANTES de rotas com parâmetros (:id)
router.get('/profiles', controller.getProfiles);
router.get('/profiles/primary', controller.getPrimaryProfile);
router.get('/profiles/limit', controller.getProfilesLimit); // Deve vir antes de /profiles/:id
router.get('/profiles/:id', controller.getProfile);
router.post('/profiles', controller.createProfile);
router.put('/profiles/:id', controller.updateProfile);
router.delete('/profiles/:id', controller.deleteProfile);

// Limites e Upgrade
router.get('/upgrade-plans', controller.getUpgradePlans);

module.exports = router;
