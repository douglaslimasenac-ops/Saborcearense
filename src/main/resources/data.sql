-- Inserir Produtos Fixos (Bebidas e Acompanhamentos) na tabela 'produtos'
MERGE INTO produtos (id, nome, descricao, preco, categoria, disponivel) 
KEY(id) 
VALUES (1, 'Cerveja Artesanal Alcaçuz', 'Long neck gelada produzida na região', 12.00, 'BEBIDA', true);

MERGE INTO produtos (id, nome, descricao, preco, categoria, disponivel) 
KEY(id) 
VALUES (2, 'Suco Natural de Caju', 'Feito com a pura fruta da região', 7.50, 'BEBIDA', true);

MERGE INTO produtos (id, nome, descricao, preco, categoria, disponivel) 
KEY(id) 
VALUES (3, 'Refrigerante Lata', 'Coca-Cola ou Guaraná Antarctica 350ml', 5.00, 'BEBIDA', true);

-- Inserir Pratos Rotativos na tabela 'pratos' (Mapeados por dia da semana)
MERGE INTO pratos (id, nome, descricao, preco, esgotado, dia_da_semana) 
KEY(id) 
VALUES (1, 'Baião de Dois com Carne de Sol', 'Arroz, feijão de corda, queijo coalho e carne de sol acebolada', 35.90, false, 'FRIDAY');

MERGE INTO pratos (id, nome, descricao, preco, esgotado, dia_da_semana) 
KEY(id) 
VALUES (2, 'Painel de Cabrito', 'Cabrito cozido no leite de coco acompanhado de cuscuz nordestino', 38.00, false, 'SATURDAY');

MERGE INTO pratos (id, nome, descricao, preco, esgotado, dia_da_semana) 
KEY(id) 
VALUES (3, 'Feijoada Completa Cearense', 'Acompanha arroz branco, couve refogada, farofa e laranja', 32.00, false, 'SUNDAY');
