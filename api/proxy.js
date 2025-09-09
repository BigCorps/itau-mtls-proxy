const https = require('https' );
const axios = require('axios');

// Esta é a função que a Vercel irá executar
module.exports = async (req, res) => {
  // Permite que a nossa Edge Function da Supabase chame este proxy
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Use POST.' });
  }

  try {
    // Pega os certificados e chaves das variáveis de ambiente da Vercel
    const cert = process.env.ITAU_CERT.replace(/\\n/g, '\n');
    const key = process.env.ITAU_KEY.replace(/\\n/g, '\n');

    if (!cert || !key) {
      throw new Error('Certificado ou chave do Itaú não encontrados nas variáveis de ambiente.');
    }

    // Cria um agente HTTPS customizado com os certificados
    const httpsAgent = new https.Agent({
      cert: cert,
      key: key,
      rejectUnauthorized: false // Necessário para os ambientes de sandbox do Itaú
    } );

    // Pega os dados da requisição que nossa Edge Function enviou
    const { url, method, headers, body } = req.body;

    // Usa o Axios para fazer a chamada final para a API do Itaú com o agente HTTPS
    const response = await axios({
      url: url,
      method: method,
      headers: headers,
      data: body,
      httpsAgent: httpsAgent
    } );

    // Retorna a resposta do Itaú de volta para a nossa Edge Function
    res.status(response.status).json(response.data);

  } catch (error) {
    console.error('Erro no proxy:', error.message);
    const status = error.response ? error.response.status : 500;
    const data = error.response ? error.response.data : { error: 'Erro interno no servidor proxy.', details: error.message };
    res.status(status).json(data);
  }
};
