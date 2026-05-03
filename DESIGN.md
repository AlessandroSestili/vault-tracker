---
name: Vault
description: Aggregatore finanziario personale — patrimonio netto in meno di tre secondi.
colors:
  bg-void: "#09090b"
  bg-card: "#111113"
  bg-popover: "#0f0f11"
  bg-surface: "#18181b"
  fg-primary: "#fafafa"
  fg-muted: "#71717a"
  fg-secondary: "#a1a1aa"
  live-acid: "oklch(0.82 0.18 130)"
  cat-sky: "oklch(0.78 0.14 220)"
  cat-violet: "oklch(0.72 0.18 300)"
  cat-amber: "oklch(0.75 0.16 50)"
  cat-ash: "oklch(0.72 0.02 260)"
  destructive: "#ef4444"
typography:
  display:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "26px"
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: "-0.6px"
  headline:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "-0.3px"
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "-0.1px"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "10px"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "1.5px"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.fg-primary}"
    textColor: "{colors.bg-void}"
    rounded: "{rounded.full}"
    padding: "11px 18px"
  button-primary-hover:
    backgroundColor: "oklch(0.92 0.04 130)"
    textColor: "{colors.bg-void}"
    rounded: "{rounded.full}"
    padding: "11px 18px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.fg-muted}"
    rounded: "{rounded.md}"
    padding: "6px 8px"
  button-ghost-hover:
    backgroundColor: "rgba(255,255,255,0.05)"
    textColor: "{colors.fg-primary}"
    rounded: "{rounded.md}"
    padding: "6px 8px"
  input-default:
    backgroundColor: "transparent"
    textColor: "{colors.fg-primary}"
    rounded: "{rounded.md}"
    padding: "8px 10px"
  input-focus:
    backgroundColor: "transparent"
    textColor: "{colors.fg-primary}"
    rounded: "{rounded.md}"
    padding: "8px 10px"
---

# Design System: Vault

## 1. Overview

**Creative North Star: "The Precision Ledger"**

Vault è uno strumento di misura, non un prodotto che intrattiene. Come un orologio svizzero o uno spreadsheet ben costruito, la sua qualità si percepisce nell'assenza di imperfezioni — nella distanza esatta tra due voci, nel peso preciso di un numero, nell'accento cromatico che appare solo dove serve. Il design non cerca attenzione: la riceve per precisione.

Il sistema opera nel buio perché Alessandro lo guarda spesso la sera, sul divano o sul treno, con lo schermo in mano. Il nero profondo (`#09090b`) non è un'estetica: è la condizione ambientale corretta. Il testo quasi-bianco (`#fafafa`) e il separatore quasi-invisibile (`rgba(255,255,255,0.06)`) creano profondità senza ombre, strati senza rumore.

"The Precision Ledger" rifiuta esplicitamente: dashboard anni 2020 con card ovunque e padding identico; il reflex fintech "navy-and-gold"; glassmorphism decorativo; gradient text; l'hero-metric template con big number + gradient accent. La qualità qui è la sottrazione portata fino in fondo.

**Key Characteristics:**
- Buio assoluto come superficie, non come mood
- Gerarchia tipografica affilata: peso e tracking fanno il lavoro, non il colore
- Un solo accento cromatico (Live Acid) usato con parsimonia chirurgica
- Palette semantica separata per categorie asset — dati, non decorazione
- Bordi quasi-invisibili che separano senza dividere
- Mono per ogni etichetta, numero, dato — sans per nomi e testi

## 2. Colors: The Void + Signal Palette

Sistema restrained con un accento ad alta chroma su sfondo quasi-nero. Il contrasto non viene dal colore, ma dalla luminosità.

### Primary
- **Live Acid** (`oklch(0.82 0.18 130)`): il verde-lime ad alta chroma. Usato per link attivi, valori positivi, indicatori live, il cerchio nella nav. Appare su meno del 10% di qualsiasi schermata. La sua rarità è il punto — non è un colore dell'interfaccia, è un segnale.

### Neutral
- **Void** (`#09090b`): sfondo base. Quasi-nero con leggera tinta zinc. Mai `#000`.
- **Card Ink** (`#111113`): superficie card su desktop — 2 step sopra il void, percepibile ma non gridato.
- **Popover** (`#0f0f11`): menu, dropdown, dialog. Leggermente più freddo della card.
- **Surface** (`#18181b`): stati hover, input background, secondary — il terzo strato.
- **Foreground** (`#fafafa`): testo primario. Quasi-bianco, mai puro.
- **Muted** (`#71717a`): metadati, label, testo secondario. Il colore più usato dopo il foreground.
- **Secondary** (`#a1a1aa`): testo di supporto, breadcrumb.
- **Ghost Border** (`rgba(255,255,255,0.06)`): divisori e bordi card. Percepibili, non visibili.

### Tertiary (categorie asset)
- **Sky** (`oklch(0.78 0.14 220)`): conti correnti e cash
- **Violet** (`oklch(0.72 0.18 300)`): pensione
- **Amber** (`oklch(0.75 0.16 50)`): crypto
- **Ash** (`oklch(0.72 0.02 260)`): altro / non classificato

### Named Rules
**The Signal Rule.** Live Acid non è un colore d'interfaccia — è un segnale. Una conferma, un valore live, uno stato attivo. Se compare due volte sulla stessa schermata senza motivo informativo, una delle due occorrenze è sbagliata.

**The Semantic Palette Rule.** I colori categoria (Sky, Violet, Amber, Ash) non sono mai riutilizzati fuori dal loro contesto. Non diventano accent, hover state, o decorazione.

## 3. Typography

**Display Font:** Inter (system-ui, sans-serif)
**Label / Data Font:** JetBrains Mono (monospace)

**Character:** Inter per tutto il testo narrativo e i titoli — geometrico, neutro, leggibile ad alta velocità. JetBrains Mono per numeri, etichette, ticker, dati tabulari — monospaziato per allineamento colonne e credibilità analitica. Il contrasto sans/mono è l'unico contrasto tipografico del sistema.

### Hierarchy
- **Display** (500, 26px, lh 1.1, ls -0.6px): totale netto della homepage, headline di sezione principale. Una sola istanza per pagina.
- **Headline** (500, 18px, lh 1.2, ls -0.3px): KPI numerici nelle strip metriche, valori account.
- **Title** (500, 14px, lh 1.3, ls -0.1px): nome asset, nome account, titolo riga — testo primario nelle liste.
- **Body** (400, 13px, lh 1.5): sottotitoli, note, descrizioni. Max 65ch.
- **Label** (JetBrains Mono 400, 10px, lh 1.4, ls 1.5–2px, uppercase): etichette sezione, badge categoria, timestamp, variazioni percentuali. Il mono uppercase è la firma visiva del sistema.

### Named Rules
**The Mono Data Rule.** Ogni valore numerico, percentuale, data, ticker, o variazione è reso in JetBrains Mono. Mai in Inter. Il dato ha il suo alfabeto.

**The Tracking Law.** Le label uppercase usano sempre `letter-spacing: 1.5–2px`. Le label lowercase o body non usano mai tracking positivo oltre 0.4px.

## 4. Elevation

Vault è piatto per default. Non ci sono ombre ambientali, glow decorativi, o blur glassmorphism. La profondità è tonale: ogni strato del sistema è 2–3 step di lightness sopra il precedente (void → card → surface → input). Le superfici si distinguono per colore di sfondo, non per ombra.

Un'eccezione: il FAB mobile e i dropdown usano `box-shadow: 0 8px 24px rgba(0,0,0,0.5), 0 2px 6px rgba(0,0,0,0.3)` — un'ombra forte su sfondo già scuro, per sollevare elementi flottanti sopra il contenuto. È strutturale, non decorativa.

### Shadow Vocabulary
- **Float** (`0 8px 24px rgba(0,0,0,0.5), 0 2px 6px rgba(0,0,0,0.3)`): FAB, elementi flottanti, menu contestuali. Solo per superfici elevate sopra il contenuto.

### Named Rules
**The Flat-By-Default Rule.** Le superfici sono piatte a riposo. Le ombre appaiono solo per elementi fisicamente sopraelevati (FAB, dropdown). Un card con ombra è automaticamente sbagliato.

## 5. Components

### Buttons
Raffinati e diretti — risposta immediata, nessuna cerimonia.
- **Shape:** arrotondato pieno (`border-radius: 9999px`) per il primary; angoli moderati (8–12px) per ghost e icon button.
- **Primary:** sfondo `#fafafa`, testo `#09090b`, padding `11px 18px`. Su hover: sfondo leggermente smorzato `oklch(0.92 0.04 130)`. L'unico bottone con background pieno.
- **Ghost / Icon:** sfondo trasparente, testo muted. Su hover: `rgba(255,255,255,0.05)` con transizione 150ms. Nessun bordo.
- **Danger ghost:** testo muted a riposo, testo `#ef4444` su hover con `rgba(239,68,68,0.1)` background.
- **Transition:** `transition: colors 150ms` — veloce, non animato.

### Inputs / Fields
- **Style:** bordo `border: 1px solid rgba(255,255,255,0.1)`, sfondo trasparente, radius 8px, padding `8px 10px`.
- **Focus:** `border-color` passa a `oklch(0.82 0.18 130)` con `ring: 3px oklch(0.82 0.18 130 / 0.5)`. Nessun glow decorativo — solo il confine si illumina.
- **Placeholder:** colore muted-foreground (`#71717a`).
- **Typography:** Inter 14px, peso 400.

### Cards / Containers
- **Desktop only:** `background: #111113`, `border: 1px solid rgba(255,255,255,0.06)`, `border-radius: 16px`, `padding: 8px 12px`. Le card esistono solo su desktop (md:). Mobile usa liste bare senza contenitori.
- **Nested cards:** proibite. Se un card contiene un altro elemento con sfondo e bordo, uno dei due va rimosso.
- **Shadow:** nessuna. Vedi Elevation.

### Navigation
- **Top nav (desktop):** `height: calc(3.5rem + safe-area-inset-top)`, sfondo `#09090b`, bordo inferiore ghost. Link in Inter 13–14px, muted a riposo, foreground su hover. Nessun underline.
- **Bottom nav (mobile):** 5 tab con icona + label. Icona e testo attivi in Live Acid (`oklch(0.82 0.18 130)`). Inattivi in muted. Altezza `4.5rem + safe-area-inset-bottom`. Stessa icona non usa mai colori categoria.
- **Active state:** solo Live Acid — mai un background pill, mai un underline, mai un background highlight.

### Data Rows (firma del sistema)
Le liste di asset, conti, e liability usano righe bare senza card wrapper su mobile. Struttura: `LogoAvatar 36px | Nome (Inter 500 14px) + sottotitolo (Inter 400 12px muted) | Valore (Mono 13.5px) + etichetta (Mono 10.5px muted)`. Bordo inferiore ghost `rgba(255,255,255,0.04)`. Hover desktop: opacità 0.02 background. I controlli edit/delete appaiono on-hover con opacity transition.

### FAB Mobile
- Pill centrata, sfondo `#fafafa`, testo `#09090b`, shadow Float. Posizionata `calc(4.5rem + safe-area-inset-bottom + 10px)` dal fondo. Non un cerchio — una pill con testo.

## 6. Do's and Don'ts

### Do:
- **Do** usare JetBrains Mono per ogni valore numerico, percentuale, data e ticker — senza eccezioni.
- **Do** rispettare la gerarchia degli strati: void → card → surface → input. La separazione è cromatica, non tramite ombra.
- **Do** lasciare Live Acid sotto il 10% di ogni schermata. La rarità è la sua forza.
- **Do** variare la spaziatura per creare ritmo. Sezioni diverse, respiri diversi.
- **Do** usare label uppercase con `letter-spacing: 1.5–2px` per intestazioni di sezione e badge.
- **Do** nascondere i controlli di riga (edit, delete) finché l'utente non fa hover — il dato è il protagonista, non le azioni.
- **Do** rispettare `prefers-reduced-motion` per le animazioni del grafico.

### Don't:
- **Don't** usare card ovunque. Le liste bare sono la scelta di default. Una card giustifica la sua esistenza raggruppando elementi visivamente distinti, non semplicemente contenendo qualcosa.
- **Don't** usare gradient text (`background-clip: text`). Mai. Usa peso o dimensione per enfatizzare.
- **Don't** usare glassmorphism decorativo. Backdrop-filter è proibito salvo necessità strutturale documentata.
- **Don't** costruire l'hero con il template "big number + label + stats row + gradient accent" — è il cliché SaaS che Vault rifiuta per principio.
- **Don't** riusare i colori categoria (Sky, Violet, Amber, Ash) fuori dal loro contesto semantico.
- **Don't** usare ombre su card. Solo il FAB e i dropdown flottanti hanno ombra.
- **Don't** mettere lo stesso padding ovunque. Monotonia è mancanza di cura.
- **Don't** aggiungere animazioni celebrative (confetti, scale bounce, pulse) su azioni finanziarie. La fiducia si guadagna con la sobrietà.
- **Don't** usare `border-left` o `border-right` > 1px come stripe colorata. Restringe con full border, background tint, o niente.
- **Don't** introdurre un secondo accento cromatico. Il sistema ha un solo segnale.
