# API-NCM + Gemini (Node.js)

Integração simples com a API do Gemini usando Node.js.

## 1) Instalar dependências

```bash
npm install
```

## 2) Configurar chave da API

Crie um arquivo `.env` na raiz, baseado no `.env.example`:

```env
GEMINI_API_KEY=sua_chave_aqui
```

## 3) Executar

Com prompt customizado:

```bash
npm start -- "Me explique a NCM de forma simples"
```

Sem prompt, usa um texto padrão.

## Arquivos principais

- `index.js`: faz a chamada ao Gemini (`gemini-1.5-flash`)
- `package.json`: scripts e dependências
