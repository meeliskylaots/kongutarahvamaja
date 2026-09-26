# Konguta Rahvamaja veeb

Mobiilisõbralik koduleht, töötajate siseveeb ja ruumide päringuvorm. Avalik veeb kasutab Konguta Rahvamaja praegust Apps Scripti teenust; broneeringud, kasutajad ja avalik sisu jäävad Google Sheetsi.

## Mis töötab

- Avaleht, sündmuste päevavaade, ruumide kirjeldused, kollektiivid ja kontakt.
- Saali ja väliala kasutuse päring. Server kontrollib saadavust ja saadab päringukinnituse.
- Töötaja sisselogimine sama kasutaja- ja sessioonisüsteemiga nagu Kultuuripesas. Seanss säilib lehe värskendamisel ja lõpeb väljalogimisel.
- Juhataja/admin näeb päringuid, kinnitab või lükkab need tagasi ning muudab avalehe ja ruumide infot. Kollektiivide nimekirja saab lisada, muuta ja eemaldada koos proovigraafiku, juhendaja ja kontaktidega.
- Kollektiivi juhendaja näeb oma kasutusi ja saab esitada prooviajamuudatuse palve.
- Eraürituste klientide andmeid avalikus kalendris ei näidata.

## Seadistus

Broneeringute kinnitamine ja prooviajamuudatused kasutavad praegu olemasoleva Apps Scripti töövoogu. Automaatne kinnitamine pärast kalendri ja puhvriaja kontrolli vajab serveripoolset muudatust.

Veeb kasutab praegust Apps Scripti aadressi, mis on faili `index.html` muutujas `API`. Apps Scriptis peab olema kasutusel Kultuuripesa versioon, mis toetab toiminguid `submitSiteBooking`, `daySchedule`, `authChallenge`, `authLogin`, `authSession`, `list`, `updateStatus`, `savePublicContent` ja `requestReschedule`.

Saal ja väliala on seadistatud olemasolevate ruumi ID-dega `konguta-saal` ja `konguta-valiala`. Broneeringute lõplik saadavus ja puhver kontrollitakse serveris.

## Avaldamine GitHub Pagesis

Repo töövoog `.github/workflows/pages.yml` ehitab iga `main`-haru muudatuse järel Pagesi paketi. GitHubis ava **Settings → Pages** ja vali **Source: GitHub Actions**. Valmis aadress ilmub Pagesi seadetes ja Actionsi töövoo tulemusena.

## Sisu ja pildid

Töötaja siseveebi sisuhalduses saab muuta avalehe teksti ja pilti, ruumide kirjeldusi ning kollektiivide kõiki avalikke välju. Pildid lisatakse HTTPS-lingina. Kodulehe sisu salvestatakse olemasoleva Apps Scripti avaliku sisu tabelisse; koodimuudatusi pole tavaliseks sisuhalduseks vaja.

## Arendus

Leht on staatiline `index.html`; eraldi pakette ega ehitust pole vaja. Ava fail lokaalses veebiserveris või kasuta GitHub Pagesi eelvaadet. Apps Scripti POST-päringud kasutavad `no-cors` režiimi ja kinnitavad tulemuse operatsiooni oleku päringuga.
