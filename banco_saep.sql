CREATE DATABASE saep_db;
USE saep_db;

CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100),
    email VARCHAR(100) UNIQUE,
    senha VARCHAR(100)
);

-- TABELA ADAPTADA PARA FERRAMENTAS
CREATE TABLE produtos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100),
    tipo VARCHAR(50),          -- Ex: Martelo, Chave, Furadeira
    material_cabo VARCHAR(50), -- Ex: Madeira, Tubular, Emborrachado
    tamanho VARCHAR(50),       -- Ex: 16 oz, 10mm
    tensao VARCHAR(20),        -- Ex: 110v, 220v, N/A
    preco DECIMAL(10,2),
    quantidade INT
);

CREATE TABLE movimentacoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    produto_id INT,
    tipo VARCHAR(10),
    quantidade INT,
    data_movimentacao DATETIME,
    FOREIGN KEY (produto_id) REFERENCES produtos(id)
);

-- POPULAÇÃO (Exemplo do seu martelo)
INSERT INTO usuarios (nome, email, senha) VALUES ('Admin', 'admin@saep.com', '1234');

INSERT INTO produtos (nome, tipo, material_cabo, tamanho, tensao, preco, quantidade) VALUES 
('Martelo de Unha MASTER Perfil Reto', 'Martelo', 'Tubular', '16 oz', 'N/A', 45.90, 20),
('Chave Phillips', 'Chave Manual', 'Plástico', '1/4 x 6', 'N/A', 12.50, 50),
('Furadeira de Impacto Bosch', 'Elétrica', 'Emborrachado', '1/2 pol', '220v', 350.00, 5);