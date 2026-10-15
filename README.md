# FrameLab — Protótipo educacional de editor de vídeo

Projeto independente de estudo inspirado na experiência visual de editores de vídeo online, incluindo Captions. **Não é uma cópia do código, não é afiliado à Captions e não usa seus serviços privados.**

## Funcionalidades reais

- Interface responsiva de dashboard e estúdio, com navegação funcional.
- Importação local de arquivos MP4, WEBM ou MOV (depende dos codecs disponíveis no navegador).
- Prévia do vídeo com controles de reprodução, áudio e linha do tempo.
- Inserção de texto estático ou arquivo `.srt` com legendas sincronizadas.
- Quatro estilos de legenda, seleção de tamanho, cor e posição.
- Escolha de 9:16, 16:9 e 1:1 sem distorcer a imagem.
- Exportação para WebM diretamente no navegador com `Canvas.captureStream` e `MediaRecorder`; exige navegador compatível e leva aproximadamente o tempo da duração do vídeo.
- Áudio do arquivo original incluído quando Web Audio e o formato do arquivo são compatíveis.

## Limitações honestas

- A transcrição automática, os avatares, a dublagem, a IA generativa e a edição automática do Captions **não estão implementados**.
- Os arquivos nunca são enviados para servidor. A lista de projetos existe apenas na sessão da página; atualizar a página perde os arquivos selecionados.
- Exportação em MP4 não foi implementada. A versão exporta WebM.
- Estilos, legendas e formato são aplicados na saída; não há ferramenta de corte por trecho nesta versão.
- O desempenho da exportação depende do navegador e hardware. Recomenda-se Chrome ou Edge atuais, vídeo curto (2–15 segundos) nos primeiros testes.

## Como executar localmente

Não precisa instalar pacotes ou configurar API.

```bash
cd framelab-captions-estudo
python -m http.server 8080
```

Abra **http://localhost:8080** no Google Chrome ou Microsoft Edge.

## Como publicar gratuitamente no GitHub Pages

1. Crie um **novo repositório público** na sua conta GitHub (por exemplo, `framelab-ai`).
2. Faça upload de `index.html`, `styles.css` e `app.js` na **raiz** do repositório.
3. Vá em **Settings → Pages → Build and deployment**.
4. Escolha **Deploy from a branch**, branch **main**, pasta **/(root)** e salve.
5. Aguarde o GitHub criar o link, normalmente `https://gilbertlima.github.io/framelab-ai/`.
6. Abra a URL publicada e repita o teste de upload, legendas e exportação.

## Como publicar na Vercel

Importe o repositório do GitHub na Vercel como um projeto estático. Framework preset **Other**. Não requer build (`index.html` está na raiz).

## Roteiro de teste

1. Abra o dashboard. Clique em **Criar novo projeto** e selecione um MP4 curto.
2. Reproduza e arraste a linha do tempo.
3. Digite sua legenda na aba **Legendas**; verifique a prévia.
4. Na aba **Estilos**, selecione **Impacto**, cor e posição.
5. Na aba **Formato**, selecione **16:9** e verifique as barras pretas se necessárias.
6. Opcionalmente importe um arquivo `.srt` válido e confira a sincronização.
7. Clique em **Exportar vídeo**; aguarde a exportação e abra o arquivo WebM baixado.

## Próximos passos possíveis

Para ter transcrição automática de verdade, integrar um serviço de ASR (ex.: Whisper em servidor próprio). Para armazenar projetos e autenticar usuários, integrar backend e banco de dados. Para exportar MP4, usar `ffmpeg.wasm` ou processamento backend.
