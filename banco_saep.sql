CREATE DATABASE saep_db;
USE saep_db;

CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100),
    email VARCHAR(100) UNIQUE,
    senha VARCHAR(100)
);

CREATE TABLE produtos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100),
    preco DECIMAL(10,2),
    quantidade INT
);

CREATE TABLE movimentacoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    produto_id INT,
    tipo VARCHAR(10), -- 'entrada' ou 'saida'
    quantidade INT,
    data_movimentacao DATETIME,
    FOREIGN KEY (produto_id) REFERENCES produtos(id)
);

-- População (Item 3.2)
INSERT INTO usuarios (nome, email, senha) VALUES 
('Admin', 'admin@saep.com', '1234'),
('Gerente', 'gerente@saep.com', '1234'),
('Funcionario', 'user@saep.com', '1234');

INSERT INTO produtos (nome, preco, quantidade) VALUES 
('Teclado USB', 50.00, 100),
('Mouse Óptico', 25.00, 50),
('Monitor 24pol', 800.00, 10);

INSERT INTO movimentacoes (produto_id, tipo, quantidade, data_movimentacao) VALUES 
(1, 'entrada', 10, NOW()),
(2, 'saida', 5, NOW()),
(1, 'saida', 2, NOW());