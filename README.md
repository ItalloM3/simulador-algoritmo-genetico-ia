# Simulador de Algoritmo Genético - Projetos do Campus

**Autor:** Ítallo Márlon de Sousa Alves
**Disciplina:** Inteligência Artificial (2026.2) - Ciência da Computação, UFPI

## Descrição da Solução
Este projeto é um simulador de algoritmo genético desenvolvido em HTML, CSS e JavaScript (sem dependências de servidores) que visa selecionar projetos de melhoria para um campus universitário. O objetivo é maximizar os benefícios (aptidão) sem ultrapassar um orçamento limite. 

O algoritmo utiliza uma representação binária (onde 1 indica seleção do projeto e 0 a exclusão). A evolução é conduzida por:
- Inicialização aleatória.
- Avaliação com um mecanismo de reparação para soluções inviáveis (remoção do projeto com menor razão benefício/custo).
- Seleção por torneio (desempate pelo menor índice na população).
- Cruzamento de um ponto (corte entre o primeiro e o penúltimo gene).
- Mutação por inversão de bits.
- Elitismo (preservação exata dos melhores indivíduos).

O simulador fornece total transparência do processo através de logs detalhados e animações didáticas de cada etapa reprodutiva, refletindo fielmente os cálculos matemáticos subjacentes.

## Instruções de Uso
1. Aceda ao link da aplicação no GitHub Pages. Não é necessário qualquer instalação ou login.
2. Na barra lateral esquerda, configure os **Projetos e orçamento** e os **Parâmetros do algoritmo**.
3. Utilize os botões superiores para controlar a execução:
   - **Executar:** Roda o simulador automaticamente até ao limite de gerações. Pode ajustar a velocidade no menu ao lado.
   - **Pausar:** Interrompe a execução atual, preservando o estado.
   - **Avançar uma geração:** Processa apenas um ciclo reprodutivo e pausa novamente, ideal para observar o processo passo a passo.
   - **Reiniciar:** Restabelece o estado inicial com a semente configurada, limpando o histórico.
4. Navegue pelos separadores inferiores ("Log da geração", "Histórico", "População", "Testes de validação") para analisar os resultados. Clique em qualquer registo no "Log da geração" para visualizar a animação da operação genética no quadro acima.

## Parâmetros Disponíveis
- **Projetos:** Lista de 4 a 15 projetos, cada um com nome, custo em reais (positivo) e benefício (não negativo).
- **Orçamento disponível:** Valor financeiro máximo permitido (finito e não negativo).
- **Tamanho da população:** Quantidade de indivíduos mantida de forma constante por geração (≥ 2).
- **Número de gerações:** Condição de paragem do algoritmo (≥ 1).
- **Taxa de cruzamento (%):** Probabilidade (0 a 100) aplicada a cada par de pais selecionados para o cruzamento.
- **Taxa de mutação (%):** Probabilidade (0 a 100) aplicada de forma independente a cada gene dos descendentes.
- **Tamanho do torneio:** Número de candidatos avaliados numa seleção (entre 2 e o tamanho da população).
- **Indivíduos de elite:** Quantidade de melhores indivíduos preservados sem alterações para a próxima geração (entre 0 e população - 1).
- **Semente aleatória:** Valor inteiro que inicializa o gerador pseudoaleatório (Mulberry32), garantindo a reprodutibilidade da execução.

## Bibliotecas Auxiliares
A lógica do Algoritmo Genético, do motor estrutural e da manipulação do DOM foram desenvolvidas puramente com JavaScript (Vanilla). As únicas dependências externas incluídas são para tipografia visual e estilos padrão:
- **Google Fonts (Archivo e Spline Sans Mono):** Utilizadas apenas para renderização visual da interface do utilizador e estilização dos cromossomas.
*Nenhuma biblioteca de otimização ou inteligência artificial foi utilizada.*

## Resultados dos Testes de Validação (Secção 6)
O simulador possui um validador embutido no separador "Testes de validação" que avalia as operações genéticas controladas exigidas na secção 6.

- **[OK] 6.2 Avaliação de 1100 (orçamento R$ 7.000):** projetos A e B; custo R$ 7.000,00; benefício 12,00; saldo R$ 0,00; viável; aptidão 12,00.
- **[OK] 6.2 Tabela das soluções viáveis:** 9 soluções viáveis conferidas (custo e benefício); as outras 7 combinações são inviáveis.
- **[OK] 6.3 Reparação de 1111:** 1111 → 1101 → 1100; removidos C e depois D; custo final R$ 7.000,00; benefício 12,00.
- **[OK] 6.4 Cruzamento 11|00 + 00|11:** filho 1 = 1111; filho 2 = 0000.
- **[OK] 6.4 Mutação do 1º gene do filho 1:** filho 1 = 0111; filho 2 = 0000.
- **[OK] 6.4 Reparação e avaliação dos filhos:** filho 1: 0111 → 0101 → 0100, custo R$ 3.000,00, aptidão 5,00; filho 2: 0000, custo R$ 0,00, aptidão 0,00.
- **[OK] 6.4 Limites da mutação:** 0%: nenhum gene invertido; 100%: 101101 → 010010.
- **[OK] 6.4 Cruzamento 0%:** pares verificados com cruzamento 0% copiam exatamente os pais antes da mutação.
- **[OK] 6.4 Seleção e Empate:** Torneio de 1000 (7), 0011 (11) e 1100 (12) seleciona vencedor 1100. Em empate, seleciona-se corretamente o candidato de menor índice.
- **[OK] 6.6 Limites de Orçamento:** Orçamento R$ 0 resulta na população avaliada toda em 0000. Orçamento R$ 14.000 viabiliza 1111 sem reparação.
- **[OK] 6.5 Execução Completa:** Histórico guarda exatamente 51 registos. Melhor acumulado nunca diminui. Melhor da população não diminui com elitismo.

### 6.5 Efeito da Mutação (1% vs 20%)
*Parâmetros base: População 20, 50 gerações, cruzamento 80%, torneio 2, elite 1, orçamento R$ 7.000.*
- **Mutação 1% (sementes 1 a 5):** Atingiram 12 em todas as execuções (12, 12, 12, 12, 12). Média: 12,00.
- **Mutação 20% (sementes 1 a 5):** Atingiram 12 em todas as execuções (12, 12, 12, 12, 12). Média: 12,00.

**Interpretação:** Em ambos os cenários, o algoritmo encontrou o ótimo global de 12. Uma vez que o espaço de busca deste exemplo inicial é bastante reduzido (apenas 4 projetos resultam em 16 combinações possíveis), qualquer perturbação gerada pela mutação combinada com os restantes parâmetros base é suficiente para convergir rapidamente para a melhor solução, não havendo disparidade de desempenho entre 1% e 20% neste conjunto restrito de dados.