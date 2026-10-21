-- Limpa resquícios das tabelas para evitar erros de chaves duplicadas
DELETE FROM produto;
DELETE FROM pratos;

-- Inserir Produtos Fixos (Bebidas) na tabela correta 'produto' (p minúsculo e sem s)
INSERT INTO produto (id, nome, descricao, preco, categoria, disponivel) 
VALUES (1, 'Cerveja Artesanal Alcaçuz', 'Long neck gelada produzida na região', 12.00, 'BEBIDA', true);

INSERT INTO produto (id, nome, descricao, preco, categoria, disponivel) 
VALUES (2, 'Suco Natural de Caju', 'Feito com a pura fruta da região', 7.50, 'BEBIDA', true);

INSERT INTO produto (id, nome, descricao, preco, categoria, disponivel) 
VALUES (3, 'Refrigerante Lata', 'Coca-Cola ou Guaraná Antarctica 350ml', 5.00, 'BEBIDA', true);

-- Inserir Pratos Rotativos na tabela correta 'pratos'
INSERT INTO pratos (id, nome, descricao, preco, esgotado, dia_da_semana) 
VALUES (1, 'Baião de Dois com Carne de Sol', 'Arroz, feijão de corda, queijo coalho e carne de sol acebolada', 35.90, false, 'FRIDAY');

INSERT INTO pratos (id, nome, descricao, preco, esgotado, dia_da_semana) 
VALUES (2, 'Painel de Cabrito', 'Cabrito cozido no leite de coco acompanhado de cuscuz nordestino', 38.00, false, 'SATURDAY');

INSERT INTO pratos (id, nome, descricao, preco, esgotado, dia_da_semana) 
VALUES (3, 'Feijoada Completa Cearense', 'Acompanha arroz branco, couve refogada, farofa e laranja', 32.00, false, 'SUNDAY');
