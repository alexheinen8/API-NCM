require("dotenv").config();
const express = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("? Defina GEMINI_API_KEY no arquivo .env");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);
const app = express();
const port = Number(process.env.PORT) || 3000;
const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";

app.use(express.json());

function extrairPrimeiroJson(texto) {
  if (!texto) return null;

  const comCodeBlock = texto.match(/```json\s*([\s\S]*?)\s*```/i);
  if (comCodeBlock?.[1]) return comCodeBlock[1].trim();

  const inicio = texto.indexOf("{");
  const fim = texto.lastIndexOf("}");
  if (inicio === -1 || fim === -1 || fim <= inicio) return null;

  return texto.slice(inicio, fim + 1);
}

function validarResposta(objeto) {
  if (!objeto || typeof objeto !== "object") return false;
  if (typeof objeto.produto_original !== "string") return false;
  if (typeof objeto.ncm !== "string") return false;
  if (!Array.isArray(objeto.variacoes_descricao)) return false;
  if (objeto.variacoes_descricao.length === 0) return false;

  return objeto.variacoes_descricao.every((item) => typeof item === "string" && item.trim().length > 0);
}

function montarPromptNcm(produto) {
  return [
    "Você é especialista fiscal em NCM no Brasil.",
    "Receba o nome de um produto e responda APENAS com JSON válido (sem markdown, sem comentários).",
    "Retorne exatamente este formato:",
    "{",
    '  "produto_original": "string",',
    '  "ncm": "string no formato NNNN.NN.NN",',
    '  "variacoes_descricao": ["string", "string", "string"]',
    "}",
    "Regras:",
    "- A chave ncm deve conter 8 dígitos no padrão 0000.00.00.",
    "- variacoes_descricao deve ter de 3 a 8 variações curtas e comerciais do nome do produto.",
    "- Inclua variações com e sem hífen e abreviações quando fizer sentido.",
    "- Não inclua texto extra fora do JSON.",
    "Exemplo de variações esperadas para refrigerante lata:",
    '"COCA COLA LATA", "COCA LATA", "COCA-COLA LATA"',
    `Produto: ${produto}`,
  ].join("\n");
}

async function perguntarAoGemini(produto) {
  const model = genAI.getGenerativeModel({ model: modelName });
  const prompt = montarPromptNcm(produto);
  const result = await model.generateContent(prompt);
  const texto = result.response.text();
  const jsonTexto = extrairPrimeiroJson(texto);

  if (!jsonTexto) {
    throw new Error("Não foi possível extrair JSON da resposta do Gemini.");
  }

  const resposta = JSON.parse(jsonTexto);
  if (!validarResposta(resposta)) {
    throw new Error("JSON retornado fora do formato esperado.");
  }

  return resposta;
}

app.get("/health", (_, res) => {
  res.json({ ok: true, model: modelName });
});

app.post("/ncm", async (req, res) => {
  const produto = String(req.body?.produto || "").trim();

  if (!produto) {
    return res.status(400).json({
      erro: "Campo 'produto' é obrigatório.",
      exemplo: { produto: "COCA COLA LATA" },
    });
  }

  try {
    const resposta = await perguntarAoGemini(produto);
    return res.json(resposta);
  } catch (error) {
    return res.status(502).json({
      erro: "Falha ao gerar classificação via Gemini.",
      detalhe: error.message || String(error),
    });
  }
});

app.listen(port, () => {
  console.log(`? API NCM rodando em http://localhost:${port}`);
});
