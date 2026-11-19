# GTA 7: Markus City

Barnevennlig GTA-inspirert bilspill i nettleseren, laget for Markus (11). Ingen våpen og ingen vold: man kjører rundt i Markus City, gjør oppdrag, tjener penger og kjøper nye biler. Politiet gir bot i stedet for noe verre.

Spill: https://kschulst.github.io/gta7/

## Kontroller

| | Mobil | PC |
| --- | --- | --- |
| Gå / kjøre | Joystick (dra hvor som helst på venstre halvdel) | Piltaster / WASD |
| Inn/ut av bil | 🚗 / 🚪 | E |
| Turbo (i bil) / løpe (til fots) | 🔥 / 🏃 (hold inne) | Shift |
| Tut (i bil) / dans (til fots) | 📯 / 🕺 | H / Q |
| Pause | ⏸ | Esc |

I bil med joystick peker man i retningen bilen skal kjøre. Peker man rett bakover når bilen står stille, rygger den.

## Innhold

- Oppdrag: Pizzabudet, Taxi-Markus, Diamantjakten, Gateløpet, Obby-mesteren, Bananabanditten og finalen hos Ordføreren (låses opp når de seks første er klare, gir Gullbilen).
- Politistjerner: krasj i biler eller skremming av fotgjengere gir stjerner. Blir man tatt, får man en bot på inntil 100 kr. Lakkering i Markus' garasje (50 kr) fjerner stjernene.
- Bilbutikk i garasjen, «Hent bil» hjemme hos Markus.
- 25 gjemte gullmynter.
- Lagring skjer automatisk i nettleseren (localStorage).

## Teknisk

Ren HTML/CSS/JavaScript uten byggesteg: `index.html`, `style.css`, `game.js`. Kjør lokalt med f.eks. `python3 -m http.server` og åpne http://localhost:8000. `#demo`, `#demo-foot` og `#demo-mission` i URL-en hopper rett inn i spillet (brukt til testing).
