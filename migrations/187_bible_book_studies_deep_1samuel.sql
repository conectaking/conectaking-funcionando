-- Migration 187: Estudo profundo expandido – 1 Samuel (modelo de estudo completo)
-- Execute após 186. Atualiza o conteúdo de 1 Samuel para um estudo de verdade, não apenas demonstração.
-- Use este formato para enriquecer os demais livros (pesquisa, fontes confiáveis, múltiplos parágrafos por seção).

UPDATE bible_book_studies
SET
  title = 'Estudo profundo do livro de 1 Samuel',
  content = 'SIGNIFICADO DO LIVRO

O livro de 1 Samuel ocupa um lugar central no Antigo Testamento: narra a transição de Israel do período dos juízes para a monarquia. O nome vem do profeta Samuel, figura central na primeira parte do livro — último dos juízes e quem ungiu os dois primeiros reis, Saul e Davi. O tema não é apenas a história de um reino humano, mas a realeza do próprio Deus sobre o seu povo: quem governa de fato é o Senhor; os reis são instrumentos que Ele levanta ou põe de lado segundo a obediência e o coração.

O livro mostra como o pedido de um rei "como têm as outras nações" foi ao mesmo tempo concedido e corrigido por Deus: a monarquia é estabelecida, mas o critério de escolha do rei não é a aparência nem a força — é o coração (1 Sm 16:7). Assim, 1 Samuel prepara o caminho para a aliança davídica e, no horizonte bíblico, para o Rei messiânico.

CONTEXTO HISTÓRICO

Os eventos de 1 Samuel cobrem aproximadamente 150 anos, a partir do nascimento de Samuel (por volta de 1120 a.C.) até a morte de Saul. Israel vivia em decadência espiritual e moral: o sacerdócio em Siló estava corrompido (Eli e seus filhos), a arca foi capturada pelos filisteus, e as tribos estavam fragmentadas e ameaçadas por inimigos. O povo pediu um rei para "ser como as outras nações" e para liderar nas batalhas; Deus atende ao pedido, mas adverte sobre o custo da monarquia (tributos, recrutamento, centralização) e mantém a soberania: o rei deve representar o Senhor e obedecer à sua palavra.

O QUE O LIVRO DEMONSTRA

1 Samuel demonstra que Deus escolhe e rejeita líderes segundo o coração e a obediência, não segundo a estatura ou o sucesso humano. Saul é escolhido e depois rejeitado por desobedecer (oferta em Gilgal, não destruir Amaleque); Davi é ungido "segundo o coração de Deus" e, mesmo perseguido, não levanta a mão contra o ungido do Senhor. O livro ensina que obediência vale mais que sacrifício (1 Sm 15:22) e que a humildade e a dependência de Deus caracterizam o líder que permanece. A inveja e a desobediência de Saul levam à perda do reino e à tragédia; a fidelidade de Davi prepara o trono eterno prometido.

PERSONAGENS PRINCIPAIS

Samuel — Profeta, sacerdote e último juiz. Nascido por resposta à oração de Ana, consagrado ao Senhor em Siló, chamado ainda criança. Restaura a ordem religiosa, unge Saul e depois Davi, e representa a voz de Deus na transição para a monarquia.

Saul — Primeiro rei de Israel, da tribo de Benjamim. Inicialmente humilde, depois desobedece (sacrifício em Gilgal, poupa Agague e o melhor do rebanho em vez de destruir Amaleque). Rejeitado por Deus, persegue Davi por inveja e termina em derrota e morte no monte Gilboa.

Davi — Pastor de Belém, ungido rei em lugar de Saul. Vence Golias, conquista a amizade de Jônatas, é perseguido por Saul mas não o mata. "Homem segundo o coração de Deus", precursor do Rei messiânico.

Outros: Eli (sacerdote em Siló, família corrompida); Jônatas (filho de Saul, amigo leal de Davi); Golias (gigante filisteu); Abigail (esposa de Nabal, depois de Davi); Natã e Gade (profetas que aparecem no contexto do reinado).

ESTRUTURA E RESUMO

Capítulos 1–7 — Samuel: nascimento e chamado (1–3); arca capturada e devolvida, vitória sobre os filisteus (4–7). Fim do sacerdócio de Eli e consolidação de Samuel como líder.

Capítulos 8–15 — Saul: pedido do povo por um rei (8); Saul escolhido e ungido (9–10); vitórias iniciais (11); discurso de Samuel sobre a realeza (12); desobediência em Gilgal e rejeição (13); guerra contra Amaleque e nova desobediência — "obediência é melhor que sacrifício" (15). Saul é rejeitado para o trono.

Capítulos 16–31 — Davi: unção secreta de Davi (16); Davi e Golias (17); aliança com Jônatas e início da perseguição (18–20); Davi fugitivo, poupa Saul duas vezes (21–26); Saul e a necromante, morte de Saul e de Jônatas (27–31). O caminho está aberto para Davi reinar.

TEMAS PRINCIPAIS

Realeza e teocracia — Deus continua sendo o verdadeiro Rei; o rei humano deve governar sob a sua palavra.

Obediência e rejeição — A desobediência de Saul contrasta com a submissão de Davi; Deus honra a quem o honra (1 Sm 2:30).

Coração segundo Deus — A escolha de Davi (e a rejeição de Saul) mostra que o Senhor vê o coração, não a aparência.

Aliança e fidelidade — Jônatas e Davi; Davi e Saul (não matar o ungido); a promessa do trono eterno para a casa de Davi.

Profecia e reino — Samuel, Natã e Gade representam a palavra de Deus sobre reis e reinado; o livro prepara a esperança messiânica.',
  updated_at = NOW()
WHERE book_id = '1sm';
