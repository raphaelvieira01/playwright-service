const express = require('express');
const puppeteer = require('puppeteer');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

// Rota de teste para ver se o servidor está vivo
app.get('/', (req, res) => {
    res.send('Servidor Scraper está rodando! Use POST /scrape para acessar.');
});

app.post('/scrape', async (req, res) => {
    console.log('=== NOVA REQUISIÇÃO RECEBIDA ===');
    console.log('Body:', req.body);

    const { url, email, password } = req.body;

    if (!url || !email || !password) {
        console.error('Erro: Faltam dados no body');
        return res.status(400).json({ error: 'Faltam dados (url, email, password). Verifique se enviou no BODY (JSON).' });
    }

    let browser;
    try {
        console.log('Iniciando navegador com configurações leves...');
        
        browser = await puppeteer.launch({
            // CONFIGURAÇÕES CRITICAS PARA O RAILWAY NÃO TRAVAR
            args: [
                "--disable-setuid-sandbox",
                "--no-sandbox",
                "--single-process",
                "--no-zygote",
                "--disable-dev-shm-usage", // <--- ESSA LINHA EVITA O ERRO 502
                "--disable-gpu",
                "--disable-extensions"
            ],
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
            headless: 'new'
        });

        const page = await browser.newPage();
        
        // Otimiza para gastar menos recurso
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
                req.abort(); // Não carrega imagens nem fontes para ser rápido
            } else {
                req.continue();
            }
        });

        console.log(`Navegando para: ${url}`);
        // Aumentei o timeout para 60 segundos
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

        console.log('Página acessada. Procurando campos de login...');
        
        // Espera inteligente
        await page.waitForSelector('input[type="email"]', { timeout: 20000 });
        
        console.log('Digitando credenciais...');
        await page.type('input[type="email"]', email);
        await page.type('input[type="password"]', password);
        await page.keyboard.press('Enter');

        console.log('Login enviado. Aguardando...');
        
        // Espera fixa de segurança (5 segundos)
        await new Promise(r => setTimeout(r, 5000));

        // Pega o conteúdo
        const content = await page.evaluate(() => document.body.innerText);
        
        console.log('Sucesso! Conteúdo capturado.');
        res.json({ success: true, data: content });

    } catch (error) {
        console.error('ERRO NO PUPPETEER:', error);
        // Retorna o erro exato para o n8n
        res.status(500).json({ 
            error: 'Erro interno no navegador', 
            details: error.message 
        });
    } finally {
        if (browser) {
            console.log('Fechando navegador...');
            await browser.close();
        }
    }
});

const P
