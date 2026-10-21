-- Inserir Produtos Fixos (Bebidas e Acompanhamentos) na tabela 'produtos'
INSERT INTO produtos (nome, descricao, preco, categoria, disponivel) 
VALUES ('Cerveja Artesanal Alcaçuz', 'Long neck gelada produzida na região', 12.00, 'BEBIDA', true)
ON CONFLICT DO NOTHING;

INSERT INTO produtos (nome, descricao, preco, categoria, disponivel) 
VALUES ('Suco Natural de Caju', 'Feito com a pura fruta da região', 7.50, 'BEBIDA', true)
ON CONFLICT DO NOTHING;

INSERT INTO produtos (nome, descricao, preco, categoria, disponivel) 
VALUES ('Refrigerante Lata', 'Coca-Cola ou Guaraná Antarctica 350ml', 5.00, 'BEBIDA', true)
ON CONFLICT DO NOTHING;

-- Inserir Pratos Rotativos na tabela 'pratos' (Mapeados por dia da semana)
INSERT INTO pratos (nome, descricao, preco, esgotado, dia_da_semana) 
VALUES ('Baião de Dois com Carne de Sol', 'Arroz, feijão de corda, queijo coalho e carne de sol acebolada', 35.90, false, 'FRIDAY')
ON CONFLICT DO NOTHING;

INSERT INTO pratos (nome, descricao, preco, esgotado, dia_da_semana) 
VALUES ('Painel de Cabrito', 'Cabrito cozido no leite de coco acompanhado de cuscuz nordestino', 38.00, false, 'SATURDAY')
ON CONFLICT DO NOTHING;

INSERT INTO pratos (nome, descricao, preco, esgotado, dia_da_semana) 
VALUES ('Feijoada Completa Cearense', 'Acompanha arroz branco, couve refogada, farofa e laranja', 32.00, false, 'SUNDAY')
ON CONFLICT DO NOTHING;
