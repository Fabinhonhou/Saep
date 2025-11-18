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

db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS usuarios (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT, email TEXT, senha TEXT)");
    
    // NOVA ESTRUTURA DA TABELA PRODUTOS
    db.run(`CREATE TABLE IF NOT EXISTS produtos (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        nome TEXT, 
        tipo TEXT,
        material_cabo TEXT,
        tamanho TEXT,
        tensao TEXT,
        preco REAL, 
        quantidade INTEGER
    )`);

    db.run("CREATE TABLE IF NOT EXISTS movimentacoes (id INTEGER PRIMARY KEY AUTOINCREMENT, produto_id INTEGER, tipo TEXT, quantidade INTEGER, data TEXT)");

    // Cria usuário admin (igual ao anterior)
    // ... dentro de db.serialize(() => { ...

// Cria um produto padrão se a tabela estiver vazia
    db.get("SELECT * FROM usuarios WHERE email = 'admin@saep.com'", (err, row) => {
        if (!row) {
            db.run("INSERT INTO usuarios (nome, email, senha) VALUES ('Administrador', 'admin@saep.com', '1234')");
            console.log("-> USUÁRIO ADMIN PADRÃO CRIADO: admin@saep.com / 1234");
        }
    });
    
    db.get("SELECT COUNT(*) AS count FROM produtos", (err, row) => {
        if (row && row.count === 0) {
            db.run(`INSERT INTO produtos (nome, tipo, material_cabo, tamanho, tensao, preco, quantidade) VALUES 
            ('Martelo de Unha MASTER', 'Martelo', 'Tubular', '16 oz', 'N/A', 45.90, 20),
            ('Chave Phillips', 'Chave Manual', 'Plástico', '1/4 x 6', 'N/A', 12.50, 50),
            ('Furadeira Bosch', 'Elétrica', 'Emborrachado', '1/2 pol', '220v', 350.00, 5)`);
            console.log("Produtos iniciais inseridos.");
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
// --- CORREÇÃO: Rota GET PRODUTOS (para listar tudo sem busca) ---
// --- Rota GET PRODUTOS (Mais Robusta) ---
app.get('/produtos', (req, res) => {
    // Tratando a busca vazia: se não houver busca, ou a busca for uma string vazia,
    // garantimos que o filtro não seja aplicado.
    const termoBusca = req.query.busca ? req.query.busca.trim() : '';
    
    let sql = "SELECT * FROM produtos";
    let params = [];

    // O filtro só é adicionado se o termoBusca tiver algum conteúdo real
    if (termoBusca) {
        sql += " WHERE nome LIKE ?";
        params.push(`%${termoBusca}%`);
    }

    db.all(sql, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        // console.log(`Busca SQL: ${sql} | Params: ${params}`); // Use para debug
        res.json(rows);
    });
});

app.post('/produtos', (req, res) => {
    // Recebendo os novos campos
    const { nome, tipo, material_cabo, tamanho, tensao, preco, quantidade } = req.body;
    
    const sql = `INSERT INTO produtos (nome, tipo, material_cabo, tamanho, tensao, preco, quantidade) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`;

    db.run(sql, [nome, tipo, material_cabo, tamanho, tensao, preco, quantidade], function(err) {
        if (err) return res.status(500).json(err);
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

// --- GESTÃO DE ESTOQUE (Item 7 - AGORA COM VALIDAÇÃO) ---
app.post('/movimentacoes', (req, res) => {
    const { produto_id, tipo, quantidade } = req.body;
    const data = new Date().toISOString();

    // 1. VERIFICAÇÃO INICIAL (SE FOR SAÍDA)
    if (tipo === 'saida') {
        db.get("SELECT quantidade FROM produtos WHERE id = ?", [produto_id], (err, row) => {
            if (err) return res.status(500).json({ mensagem: "Erro ao consultar estoque." });
            
            const estoqueAtual = row ? row.quantidade : 0;
            
            // VALIDAÇÃO CRÍTICA (Item solicitado)
            if (quantidade > estoqueAtual) {
                return res.status(400).json({ 
                    sucesso: false, 
                    mensagem: `Estoque insuficiente! Saldo atual: ${estoqueAtual}.` 
                });
            }

            // Se for válida, prossegue com as transações aninhadas:
            executarMovimentacao(produto_id, tipo, quantidade, data, res);
        });
    } else {
        // Se for ENTRADA, não precisa checar o estoque, apenas prossegue:
        executarMovimentacao(produto_id, tipo, quantidade, data, res);
    }
});

// Função auxiliar para evitar repetição de código
function executarMovimentacao(produto_id, tipo, quantidade, data, res) {
    const db = new sqlite3.Database('saep_db.sqlite'); // Reabre a conexão

    // 1. Registra a movimentação
    db.run("INSERT INTO movimentacoes (produto_id, tipo, quantidade, data) VALUES (?, ?, ?, ?)", [produto_id, tipo, quantidade, data], function(err) {
        
        // 2. Atualiza o saldo do produto
        const sqlUpdate = tipo === 'entrada' 
            ? "UPDATE produtos SET quantidade = quantidade + ? WHERE id = ?"
            : "UPDATE produtos SET quantidade = quantidade - ? WHERE id = ?";
        
        db.run(sqlUpdate, [quantidade, produto_id], (err) => {
            db.close();
            res.json({ sucesso: true });
        });
    });
}

// --- ROTA DE HISTÓRICO (NOVO) ---
app.get('/movimentacoes', (req, res) => {
    // O comando SQL abaixo junta a tabela movimentacoes (m) com produtos (p)
    const sql = `
        SELECT m.id, p.nome, m.tipo, m.quantidade, m.data 
        FROM movimentacoes m
        LEFT JOIN produtos p ON m.produto_id = p.id
        ORDER BY m.data DESC
    `;

    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});
app.listen(PORT, () => console.log(`Servidor rodando na porta http://localhost:3000/login.html`));