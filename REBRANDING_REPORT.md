# REBRANDING REPORT — AME

## Logo e Identidade Visual Criadas

### Arquivos SVG principais (public/branding/)
| Arquivo | Descrição |
|---------|-----------|
| `ame-logo.svg` | Logo primária — marcador geométrico + "AME" |
| `ame-logo-horizontal.svg` | Variante horizontal para cabeçalhos e hero |
| `ame-logo-dark.svg` | Variante escura para fundos claros |
| `ame-logo-white.svg` | Variante branca para fundos escuros |
| `ame-icon.svg` | Apenas o marcador geométrico (favicon, ícones, touch icons) |
| `ame-control.svg` | Logo completo "AME CONTROL" |
| `ame-vision.svg` | Logo completo "AME VISION" |

### AME Vision tablet (public/ame-vision/assets/images/logo/)
| Arquivo | Descrição |
|---------|-----------|
| `ame-logo.svg` | Logo primária do tablet (gradient navy) |
| `ame-logo-white.svg` | Versão branca (fundo escuro) |
| `ame-logo-white-nobg.svg` | Branca sem fundo (background transparente) |
| `ame-logo-header.svg` | Logo de cabeçalho com gradiente |

### Favicon
| Arquivo | Descrição |
|---------|-----------|
| `app/favicon.ico` | Regenerado com o novo marcador AME (icones 16/32/48) |

---

## Arquivos Substituídos (deletados)

### Branding antigo (public/branding/)
| Arquivo antigo | Substituído por |
|----------------|-----------------|
| `logo-oficial-alves.jpg` (189 KB) | `ame-logo.svg` + `ame-logo-horizontal.svg` |
| `logo-horizontal.png` (483 KB) | `ame-logo-horizontal.svg` |
| `logo-horizontal-azul.png` (439 KB) | `ame-logo-horizontal.svg` (unificado) |
| `logo-dark.png` (732 KB) | `ame-logo-dark.svg` |
| `favicon_final.png` (462 KB) | `app/favicon.ico` (novo design) |
| `icon.png` (707 KB) | `ame-icon.svg` |
| `brand_kit_icon.png` (707 KB) | `ame-icon.svg` |

### AME Vision antigo (public/ame-vision/assets/images/logo/)
| Arquivo antigo | Substituído por |
|----------------|-----------------|
| `logo.png` (43 KB) | `ame-logo.svg` |
| `logo_branca.png` (40 KB) | `ame-logo-white.svg` |
| `logo_branca_sem_fundo.png` (212 KB) | `ame-logo-white-nobg.svg` |
| `logo_header.png` (116 KB) | `ame-logo-header.svg` |

---

## Referências de código atualizadas

| Arquivo | Antes | Depois |
|---------|-------|--------|
| `components/Header.tsx:57` | `/branding/logo-oficial-alves.jpg` | `/branding/ame-logo.svg` |
| `components/SiteChrome.tsx:32` | `/branding/logo-oficial-alves.jpg` | `/branding/ame-logo.svg` |
| `components/admin/AMEVisionPanel.tsx:23` | `assets/images/logo/logo_header.png` | `assets/images/logo/ame-logo-header.svg` |
| `app/favicon.ico` | Marca antiga regenerada | Novo marcador AME |

---

## Imagens Mantidas Inalteradas (e por quê)

| Caminho | Motivo |
|---------|--------|
| `public/fleet/` e `public/branding/frota_*` e `public/branding/bh_*` | Fotos de veículos e eventos — conteúdo fotográfico, não identidade de marca |
| `public/cards/` | Cards de marketing com fotografia — não contêm a logo AME |
| `public/images/hero-byd.jpg`, `servicos_*.png`, etc. | Fotografias institucionais — não são logos |
| `public/ame-vision/assets/images/carros/` | Fotos da frota para o tablet — conteúdo |
| `public/ame-vision/assets/images/destinos/` | Fotos de destinos turísticos — conteúdo |
| `public/ame-vision/assets/images/qr/site.png` | QR code funcional (dados não mudam) |
| `public/ame-vision/assets/images/qr/whatsapp.png` | QR code funcional |
| `public/branding/qr-whatsapp-alves.png` | QR code com overlay — NÃO atualizado (precisa de regeneração gráfica externa) |
| `public/branding/bh_*` e `frota_alves_*` | Fotos corporativas de frota — conteúdo |
| `public/file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg` | SVGs de framework/utilidade |
| `public/next.svg`, `public/vercel.svg` | Arquivos padrão do Next.js/Vercel |

---

## Locais que Ainda Precisam de Arte Personalizada

1. **`public/branding/qr-whatsapp-alves.png`** — QR code do WhatsApp com overlay da marca antiga. Deve ser regenerado com o novo marcador AME.
2. **`public/ame-vision/assets/images/qr/site.png`** — QR code do site, mesma necessidade.
3. **`public/ame-vision/assets/images/qr/whatsapp.png`** — QR code do WhatsApp, mesma necessidade.
4. **`AUDITORIA_AME_CONTROL.txt`** — Documentação de auditoria com caminhos antigos (atualização cosmética).
5. **Materiais gráficos offline** — Cartões de visita, flyers, apresentations (fora do repositório).
6. **Redes sociais** — Foto de perfil, banners (fora do repositório).
7. **WhatsApp Business** — Foto de perfil e catálogo (fora do repositório).

---

## Identidade Visual Aplicada

- **Sistema de cor**: Azul Navy (`#1a3a6b` → `#2d6da8` gradiente), Branco, Cinza grafite (`#1a1a1a`)
- **Tipografia**: Inter / Segoe UI / sans-serif, peso 700 para o wordmark, 500 para subtítulos
- **Módulo geométrico**: Marcador em forma de "A" estilizado com dois traços diagonais bold e barra horizontal transversal — representa mobilidade, elevação e precisão executiva
- **Espaçamento**: Letter-spacing generoso no wordmark (6-8px) para sofisticação premium
- **Proporções**: ViewBox consistente, mark proporcional ao texto, centralização alinhada
- **Gradiente**: Sutil diagonal de navy escuro para navy claro, aplicado ao marcador em todas as variantes coloridas