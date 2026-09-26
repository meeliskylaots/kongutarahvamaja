# Konguta Rahvamaja veeb

Mobiilisõbralik koduleht, töötajate siseveeb ja ruumide päringuvorm. Avalik veeb kasutab Konguta Rahvamaja praegust Apps Scripti teenust; broneeringud, kasutajad ja avalik sisu jäävad Google Sheetsi.

## Mis töötab

- Avaleht, sündmuste päevavaade, ruumide kirjeldused, kollektiivid ja kontakt.
- Saali ja väliala kasutuse päring. Server kontrollib saadavust ja saadab päringukinnituse.
- Töötaja sisselogimine sama kasutaja- ja sessioonisüsteemiga nagu Kultuuripesas. Seanss säilib lehe värskendamisel ja lõpeb väljalogimisel.
- Juhataja/admin näeb päringuid, kinnitab või lükkab need tagasi ning muudab avalehe, ruumide ja kollektiivide teksti, pildilinki ja lisalinki.
- Kollektiivi juhendaja näeb oma kasutusi ja saab esitada prooviajamuudatuse palve.
- Eraürituste klientide andmeid avalikus kalendris ei näidata.

## Seadistus

Veeb kasutab praegust Apps Scripti aadressi, mis on faili `index.html` muutujas `API`. Apps Scriptis peab olema kasutusel Kultuuripesa versioon, mis toetab toiminguid `submitSiteBooking`, `daySchedule`, `authChallenge`, `authLogin`, `authSession`, `list`, `updateStatus`, `savePublicContent` ja `requestReschedule`.

Saal ja väliala on seadistatud olemasolevate ruumi ID-dega `konguta-saal` ja `konguta-valiala`. Broneeringute lõplik saadavus ja puhver kontrollitakse serveris.

## Avaldamine GitHub Pagesis

Repo töövoog `.github/workflows/pages.yml` ehitab iga `main`-haru muudatuse järel Pagesi paketi. GitHubis ava **Settings → Pages** ja vali **Source: GitHub Actions**. Valmis aadress ilmub Pagesi seadetes ja Actionsi töövoo tulemusena.

## Sisu ja pildid

Töötaja siseveebi sisuhalduses saab lisada HTTPS-pildilingi ning sisuteksti. Pildifailid ei lähe lähtekoodi ega broneeringute tabelisse. Kollektiivide põhiandmed tulevad olemasolevast `Kollektiivid` Google Sheetsi lehest.

## Arendus

Leht on staatiline `index.html`; eraldi pakette ega ehitust pole vaja. Ava fail lokaalses veebiserveris või kasuta GitHub Pagesi eelvaadet. Apps Scripti POST-päringud kasutavad `no-cors` režiimi ja kinnitavad tulemuse operatsiooni oleku päringuga.
