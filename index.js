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
                "--disable-dev-shm-usage",
                "--disable-gpu",
                "--disable-extensions"
            ],
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
            headless: 'new'
        });

        const page = await browser.newPage();
        
        // Otimiza para gastar menos recurso (bloqueia imagens)
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });

        console.log(`Navegando para: ${url}`);
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
        const html = await page.content(); // Pega o HTML também caso precise
        
        console.log('Sucesso! Conteúdo capturado.');
        res.json({ success: true, text: content, html: html });

    } catch (error) {
        console.error('ERRO NO PUPPETEER:', error);
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

// AQUI ESTAVA O ERRO: O CÓDIGO PRECISA TERMINAR ASSIM
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
