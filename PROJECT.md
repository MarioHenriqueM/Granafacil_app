Executive Summary

Projeto: OpenScore GSD – Motor de Crédito para a Economia Gig.
Elevator Pitch: Uma plataforma de Open Finance projetada para fornecer aprovação de crédito instantânea via Pix para trabalhadores informais (Uber, iFood, autônomos). O sistema resolve a exclusão financeira ao substituir comprovantes de renda tradicionais por uma análise comportamental de fluxo de caixa e frequência de ganhos, garantindo decisões rápidas e explicáveis.
Vision & Philosophy

    GSD (Get Stuff Done): O desenvolvimento prioriza entregas atômicas e funcionais. O objetivo é um MVP robusto que resolva o problema central de risco e velocidade.

    Lógica sobre Estética: Neste estágio Alpha, a integridade da simulação de crédito e a precisão do modelo de score superam o refinamento visual da interface.

    Modularidade Estrita: O sistema deve ser desacoplado para permitir que o motor de score evolua independentemente da interface ou das fontes de dados.

Tech Stack
Componente	Tecnologia	Justificativa / Trade-off
Engine (Motor)	Node.js (TypeScript)	Trade-off: Alta velocidade de desenvolvimento e facilidade de integração com APIs de Open Finance versus menor desempenho bruto em cálculos matemáticos pesados.
Frontend	React	

Agilidade na criação de dashboards funcionais para o usuário e investidores.
Banco de Dados	PostgreSQL	Consistência de dados e suporte a estruturas relacionais complexas para o histórico financeiro.
Hospedagem	Vercel / Render	

Deploy contínuo e infraestrutura simplificada para foco total no código.
System Architecture

O sistema segue uma abordagem Data-Driven, onde o comportamento do motor é parametrizado por arquivos externos, facilitando ajustes de risco sem alteração no core da lógica.

    config/: Contém as constantes globais, limites de crédito iniciais, chaves de API e presets de risco definidos pelo Head de Risco.

    data/: Armazena os perfis JSON de teste (mocks de Open Finance), tabelas de pesos para o score e dicionários de regras de compliance.

    src/:

        logic/: Scripts do motor de score (cálculo de frequência, regularidade e saldo dinâmico).

        api/: Handlers de integração com fontes externas (Uber, iFood, Bancos).

        ui/: Componentes de interface focados na experiência do usuário e transparência.

Core Loop (Decision Flow)

    Ingestion: Coleta de dados via consentimento Open Finance.

    Analysis: O motor lê as regras em config/ e os dados em data/ para avaliar a frequência de ganhos.

    Scoring: Cálculo do Score comportamental (Explicável).

    Action: Decisão de crédito imediata e trigger de pagamento via Pix.

High-Level Goals (Alpha Version)

    Motor de Score Funcional: Implementar a lógica de limites dinâmicos baseada em entradas e saídas diárias.

    Fluxo de Consentimento: Interface funcional para autorização de dados conforme LGPD/Compliance.

    Transparência de Decisão: Sistema capaz de gerar uma justificativa textual simples para cada aprovação ou negação.