# AME Control Admin v6

Atualizações da v6:

- Orçamento rápido agora usa a tabela fixa de Confins por cidade/região.
- Identificação automática simples por palavras-chave do endereço/região.
- Campos de passageiros, malas e bagagem especial.
- Alerta de orçamento manual para mais de 4 passageiros, excesso de bagagens ou veículo maior.
- Botão "Copiar orçamento" com validade de 10 dias.
- Regras mantidas:
  - Transfer Confins: tabela fixa informada pela Alves.
  - Corrida agendada: R$ 2,70/km.
  - Viagem acima de 100 km: R$ 3,50/km.
  - Orçamento manual quando houver necessidade de veículo maior ou bagagens especiais.

Senha inicial do admin: `alves2026`

Teste local:

```bash
npm install
npm run dev
```

Acesse: http://localhost:3000/admin

Observação: o build local pode falhar em ambientes sem internet por causa das fontes Google usadas no layout. O TypeScript foi validado com `npx tsc --noEmit`.
