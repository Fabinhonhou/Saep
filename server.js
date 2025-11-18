const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cors());
app.use(express.static('.')); // <--- ADICIONE ISSO

// Conexão com Banco de Dados (Arquivo local para facilitar)
const db = new sqlite3.Database('saep_db.sqlite');

// Inicializa tabelas se não existirem
db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS usuarios (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT, email TEXT, senha TEXT)");
    db.run("CREATE TABLE IF NOT EXISTS produtos (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT, preco REAL, quantidade INTEGER)");
    db.run("CREATE TABLE IF NOT EXISTS movimentacoes (id INTEGER PRIMARY KEY AUTOINCREMENT, produto_id INTEGER, tipo TEXT, quantidade INTEGER, data TEXT)");

    // Cria usuário admin padrão se não existir
    db.get("SELECT * FROM usuarios WHERE email = 'admin@saep.com'", (err, row) => {
        if (!row) {
            db.run("INSERT INTO usuarios (nome, email, senha) VALUES ('Administrador', 'admin@saep.com', '1234')");
            console.log("Usuario admin criado: admin@saep.com / 1234");
        }
    });
});

// --- ROTA DE LOGIN (Item 4) ---
app.post('/login', (req, res) => {
    const { email, senha } = req.body;
    db.get("SELECT * FROM usuarios WHERE email = ? AND senha = ?", [email, senha], (err, row) => {
        if (row) {
            res.json({ sucesso: true, usuario: row });
        } else {
            res.status(401).json({ sucesso: false, mensagem: "Email ou senha inválidos" });
        }
    });
});

// --- CRUD PRODUTOS (Item 6) ---
app.get('/produtos', (req, res) => {
    const busca = req.query.busca ? `%${req.query.busca}%` : '%';
    db.all("SELECT * FROM produtos WHERE nome LIKE ?", [busca], (err, rows) => res.json(rows));
});

app.post('/produtos', (req, res) => {
    const { nome, preco, quantidade } = req.body;
    db.run("INSERT INTO produtos (nome, preco, quantidade) VALUES (?, ?, ?)", [nome, preco, quantidade], function(err) {
        res.json({ id: this.lastID });
    });
});

app.put('/produtos/:id', (req, res) => {
    const { nome, preco } = req.body;
    db.run("UPDATE produtos SET nome = ?, preco = ? WHERE id = ?", [nome, preco, req.params.id], (err) => res.json({ sucesso: true }));
});

app.delete('/produtos/:id', (req, res) => {
    db.run("DELETE FROM produtos WHERE id = ?", [req.params.id], (err) => res.json({ sucesso: true }));
});

// --- GESTÃO DE ESTOQUE (Item 7) ---
app.post('/movimentacoes', (req, res) => {
    const { produto_id, tipo, quantidade } = req.body;
    const data = new Date().toISOString();

    // 1. Registra a movimentação
    db.run("INSERT INTO movimentacoes (produto_id, tipo, quantidade, data) VALUES (?, ?, ?, ?)", [produto_id, tipo, quantidade, data], function(err) {
        
        // 2. Atualiza o saldo do produto
        const sqlUpdate = tipo === 'entrada' 
            ? "UPDATE produtos SET quantidade = quantidade + ? WHERE id = ?"
            : "UPDATE produtos SET quantidade = quantidade - ? WHERE id = ?";
        
        db.run(sqlUpdate, [quantidade, produto_id], (err) => {
            res.json({ sucesso: true });
        });
    });
});

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));