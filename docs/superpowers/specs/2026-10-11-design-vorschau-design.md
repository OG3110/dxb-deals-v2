# DXB Deals – Design-Vorschau (Phase 1)

**Datum:** 2026-10-11 · **Status:** Entwurf zur Freigabe · **Repo:** `OG3110/dxb-deals-v2`, Branch `redesign`

## 1. Ziel

Die bestehende Seite dxb-deals.com wird komplett neu gemacht – professioneller, moderner, anschaulicher.
In **Phase 1** bauen wir **5 optimierte Designs**, jeweils mit **eigener PC- und Handy-Version**, auf echten Angebotsdaten.
Alle 5 laufen auf einer **Vercel-Vorschau-Adresse**, die jeder mit Link öffnen kann. Man kann zwischen den Designs umschalten.
**dxb-deals.com bleibt unverändert**, bis ein Design (bzw. eine PC/Handy-Kombination) gewählt ist.

**Phase 2** (nicht Teil dieser Spec): Gewinner-Design ausbauen (Detailseite pro Angebot, Sell, About, SEO) und live schalten.

### Erfolgskriterien
- Alle 5 Designs funktionieren auf PC **und** Handy, mit Suche, „All“-Übersicht, Kategorien, Sortierung, Speichern, WhatsApp-Kontakt und Schnellansicht.
- Ein geteilter Link öffnet direkt das gewünschte Design – auf dem Handy automatisch in der Handy-Version.
- Die Vorschau lädt auf dem Handy schnell (Bilder optimiert, Ziel: Flyer ≤ 250 KB statt ~1,7 MB).
- dxb-deals.com (Branch `main`) ist während Phase 1 unverändert.

## 2. Die 5 Designs

| Nr. | Basis-Entwurf | 🖥 PC | 📱 Handy |
|---|---|---|---|
| 1 | C · Modern Marketplace | Hell; Hero mit funktionierender Suche (Kategorie, Gegend, Budget), Chips, Ergebnisraster mit Zähler & Sortierung | Suchfeld oben fixiert, wischbare Chips, große Karten untereinander, Filter als Bottom-Sheet |
| 2 | S3 · Search First | Große Suche mit Live-Vorschlägen, Story-Kreise → Vollbild-Feed, Tabelle/Raster umschaltbar & sortierbar | Suche oben fixiert, Vorschläge im Vollbild, Story-Kreise, **Liste statt Tabelle**, Sortierung als Bottom-Sheet |
| 3 | S1 · Feed ⇄ All | Dunkle App: Suchleiste + Umschalter „Feed / All“, Feed mittig mit Infos links & „Up next“ rechts, All = Raster | Vollbild-Feed, oben Suche + Segment „Feed / All“, All = 2-spaltiges Raster |
| 4 | T1 · TikTok Feed | Feed mittig, leuchtender Hintergrund aus Flyer-Farben, Infos daneben; Suche & All als Overlays | Pures Vollbild-TikTok, Glas-Aktionsleiste rechts, Glas-Tab-Leiste unten |
| 5 | T2 · Split Scroll | Hell/edel: links große Zahlen & Buttons, rechts scrollen Flyer; dazu Suche & All | Flyer scrollen vertikal, unten fixierte Infoleiste mit großen Zahlen, die mitwechselt |

### Für alle Designs gilt
- **Echte Zahlen** (Anzahl Deals, Zähler je Kategorie, „ab AED …“) werden aus den Daten berechnet – keine Platzhalter.
- **Kartenbilder:** Flyer werden nie mehr abgeschnitten, sondern vollständig auf unscharfem Hintergrund aus ihren eigenen Farben gezeigt.
- **Pflicht-Funktionen:** Suchleiste, „All“-Übersicht, Kategorien, Sortierung (neueste, Preis ↑/↓, Größe), Speichern (im Browser gemerkt), WhatsApp-Button pro Deal mit vorbefüllter Nachricht inkl. Angebots-ID, Schnellansicht (Modal bzw. Bottom-Sheet) mit allen Fakten.
- **Suche:** unabhängig von Akzenten („cafe“ = „Café“), mehrere Wörter („restaurant jumeirah“), Preisfilter in Worten („under 1M“, „under 500k“).
- **Kein Nachrichten-/Chat-Feature** – Kontakt nur über WhatsApp und Anruf.
- Markenfarben: Petrol/Navy `#12303A`, Gold `#F2C94C`, plus je Design eigene Akzente. Logo `dxb-logo.png`.
- Animationen respektieren `prefers-reduced-motion`.
- Sprache der Seite: Englisch.

## 3. Aufbau & Adressen

```
/            → Auswahlseite: 5 Designs als Vorschaukarten (PC- & Handy-Screenshot), Kurzbeschreibung
/design-1/   → Modern Marketplace
/design-2/   → Search First
/design-3/   → Feed ⇄ All
/design-4/   → TikTok Feed
/design-5/   → Split Scroll
```

- **Gerät:** Jede Design-Seite enthält PC- und Handy-Version. Standard: automatisch nach Bildschirmbreite (< 768 px = Handy).
  `?view=mobile` / `?view=desktop` erzwingt eine Version (für Links und Vergleiche).
- **Umschalter (Preview-Leiste):** schwebend, einklappbar. Zeigt „1 · 2 · 3 · 4 · 5“ + Designname und „🖥 PC | 📱 Handy“.
  „📱 Handy“ auf dem PC zeigt die Handy-Version im iPhone-Rahmen (iframe auf `?view=mobile&frame=1`).
  Auf dem Handy: kleiner Knopf oben, öffnet die Leiste als Bottom-Sheet.
- **Später kombinieren:** PC- und Handy-Version sind getrennte Komponenten. In Phase 2 genügt die Wahl „PC = Design X, Handy = Design Y“.
- **Nicht indexieren:** Alle Vorschau-Seiten bekommen `<meta name="robots" content="noindex">` (zusätzlich zu Vercels Preview-Header).

## 4. Technik

- **Astro** (statische Ausgabe), TypeScript, kein UI-Framework. Interaktivität mit kleinem Vanilla-JS pro Design.
- **Projektstruktur:**
  ```
  src/
    content/listings/<id>-<slug>/index.md   ← Daten eines Angebots (Frontmatter)
    content/listings/<id>-<slug>/flyer.png  ← Instagram-Flyer
    content.config.ts                        ← Schema (zod) – Build bricht bei Fehlern ab
    lib/deals.ts          ← Laden, Kategorien, Formatierung (fmt), Suche (match/parse), WhatsApp-Link
    lib/client/*.ts       ← gemeinsame Browser-Logik: Suche, Speichern, Schnellansicht, Feed-Scroll
    components/preview/PreviewBar.astro      ← Design-/Geräte-Umschalter
    designs/d1-marketplace/{Desktop,Mobile}.astro + script.ts + styles.css
    designs/d2-search/…  d3-feed-all/…  d4-tiktok/…  d5-split/…
    pages/index.astro, pages/design-[n].astro (bzw. 5 Seiten)
  public/brand/ (Logo, Tolga-Foto)
  scripts/migrate-listings.ts               ← einmalig: alte listings.json → Ordner
  ```
- **Datenmodell (Frontmatter, Phase 1):**
  `id, title, area, category (restaurant|cafe|salon-beauty|nightlife|fitness-leisure|retail|services), price, priceType (asking|key-money), annualRent?, size?, status (available|reserved|sold), distress, originalPrice?, featured, highlights[] (optional), publishedAt`.
  Die vollständigen Highlights (aus den Flyern abgelesen) kommen in Phase 2; Phase 1 nutzt die vorhandenen Felder.
- **Kategorien-Mapping** der 26 Bestandsangebote: restaurant→Restaurant; salon + „Clinic“→Salon & Beauty; nightclub→Nightlife; gym, „Padel“, „Entertainment“→Fitness & Leisure; „Café“→Café; „Retail“, „Florist“→Retail; Rest→Services.
- **Bilder:** Astro-Bildpipeline erzeugt WebP in 2–3 Größen pro Flyer (z. B. 480/800/1200 px Breite); die Designs bekommen die URLs über ein eingebettetes JSON.
- **Daten an den Browser:** Jede Design-Seite bettet die Angebotsliste als JSON ein (kein Fetch, ~26–100 Einträge sind klein).
- **Speichern:** `localStorage` (Schlüssel `dxb:saved`), robust mit try/catch.

## 5. Deployment

- Arbeit auf Branch **`redesign`** im Repo `OG3110/dxb-deals-v2` → Vercel baut automatisch eine **Preview-Deployment-Adresse** (z. B. `dxb-deals-v2-git-redesign-….vercel.app`).
- Build-Einstellungen (Astro, `npm run build`, Ausgabe `dist`) stehen in einer Konfigurationsdatei **im Branch** – `main` und damit dxb-deals.com bleiben unberührt.
- **Zugriff für alle mit Link:** Falls Vercel Preview-Schutz aktiv ist, entweder Schutz für Previews ausschalten oder einen teilbaren Bypass-Link erzeugen. **Vor jeder Änderung an Vercel-Einstellungen wird Güney gefragt.**
- Der `.superpowers/`-Ordner (Entwurfs-Mockups) kommt nicht ins Repo (`.gitignore`).

## 6. Fehlerbehandlung

- Schema-Validierung beim Build: fehlende/falsche Felder → klare Build-Fehlermeldung, Vercel deployt nicht.
- Fehlendes Bild → neutrale Kachel mit Kategorie-Icon statt kaputtem Bild.
- Leere Suche/Filter → freundliche „Keine Treffer“-Meldung mit „Filter zurücksetzen“.
- `localStorage` nicht verfügbar (privater Modus) → Speichern funktioniert nur für die Sitzung, keine Fehlermeldung.

## 7. Tests & Abnahme

- **Unit-Tests (Vitest)** für `lib/deals.ts`: Formatierung, Kategorie-Mapping, Suche (Akzente, mehrere Wörter, „under 1M“), WhatsApp-Link.
- **Build-Test:** `npm run build` muss fehlerfrei durchlaufen (inkl. Schema-Check aller Angebote).
- **Browser-Check** je Design auf 1440×900 (PC) und 390×844 (Handy): Suche, All, Kategorie, Sortierung, Speichern, Schnellansicht, WhatsApp-Link, Umschalter. Screenshots als Nachweis.
- Abnahme durch Güney/Tolga über die Vorschau-Adresse.

## 8. Nicht Teil von Phase 1

Detailseiten pro Angebot, Sell-/About-/Privacy-Seiten, Sitemap/SEO-Daten, `npm run new`-Helfer, Admin-Oberfläche, Live-Schaltung auf dxb-deals.com.
