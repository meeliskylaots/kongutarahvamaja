# Konguta Rahvamaja veeb

Konguta avalik veeb ja töötajate töölaud. Avalik aadress: https://meeliskylaots.github.io/kongutarahvamaja/

## Haldusuuendus v3

- Juhataja ja administraator haldavad Konguta kollektiive, kontode seoseid, sisu, pilte, hinnakirja ja kõiki Konguta kalendrikirjeid.
- Kollektiivijuht muudab otse ainult oma kontoga seotud kollektiivide infot ja tulevasi proove. Kliendi broneeringud ja teiste kollektiivide haldus jäävad talle suletuks.
- Klõps kalendripäeval avab lisamise vormi. Kordamine: üks kord, igal nädalal või terve hooaeg 1. septembrist 31. juulini.
- Hooajast saab välja jätta kuupäevi. Möödunud kuupäevi vaikimisi ei lisata; juhataja saab need teadlikult kaasa võtta.
- Enne salvestamist kuvatakse kuupäevad, kirjete arv, olemasolevad samad proovid ja konfliktid. Kogu seeria kontrollitakse ning kirjutatakse ühe paketina. Konfliktide korral ei salvestata poolikut graafikut.
- Meiliteade on sisemistel kalendritoimingutel vaikimisi väljas. Valik „Saada juhatajale üks kokkuvõte meilile” saadab ühe kirja kogu toimingu kohta.
- Seeria muutmisel ja tühistamisel saab valida ühe korra, selle ja järgnevad korrad või kogu seeria. Tühistatud kirjed säilivad ning taastamine kontrollib saadavust uuesti.
- Avaliku Konguta broneeringu vaba aeg kinnitatakse automaatselt. Klient saab ühe kinnituskirja; juhatajale rutiinset broneeringukirja ei saadeta. Muude rahvamajade senine töövoog säilib.
- Kasutuste vahele peab jääma vähemalt 60 minutit. Täpselt 60-minutiline vahe on lubatud; puhvreid ei liideta kaheks tunniks.
- Muudatuste vaade asendab sisemiste meilide voogu. Klientide kontaktandmeid avalikku kalendrisse ei edastata.

## Serveriosa avaldamine on vajalik

GitHub Pages avaldab ainult veebilehe. Uued õigused, hooajagraafik ja automaatne kinnitamine vajavad ka Apps Scripti v3 juurutust. Veeb kontrollib API versiooni ja kasutab enne seda senist töölauda.

Serveri v3 lähtekood ja testid on ettevalmistatud kohalikus arendustöös. Neid ei avaldatud selles avalikus repos ega juurutatud Google’is. Omanik kinnitas ühise serveri uuendamise 28.09.2026. Google’i juurutus ootab halduskontole ligipääsu.

**Avaldamise seis:** praegune API on Kultuuripesaga ühine. Omanik lubas serverit Konguta funktsioonide jaoks uuendada, säilitades Kultuuripesa senise toimimise. Google’i juurutust pole veel tehtud, sest halduse sisselogimine polnud arendusseansist kättesaadav. Kultuuripesa repo jäi muutmata.

1. Ava Google Apps Scriptis olemasolev projekt, mille veebirakenduse aadress vastab `index.html` muutujale `API`.
2. Asenda senine broneeringute skript uuendatud failiga. Säilita olemasolev projekt, tabel ja juurutuse ID.
3. Salvesta ning vali **Deploy → Manage deployments → Edit → Version: New version → Deploy**. Kasuta olemasolevaid juurutuse ligipääsuseadeid.
4. Kontrolli olemasoleva API aadressi järel `?action=kongutaPublic`: vastuses peab olema `"apiVersion":3`.
5. Ava koduleht uuesti ja logi sisse. Vaates „Kollektiivid” seo juhendaja konto vastava kollektiiviga. Ära lisa kontrollimiseks päris hooajagraafikut enne, kui õiged ajad on teada.

Andmed jäävad senisesse Google Sheetsi. V3 lisab avaliku sisu hulka `konguta-site/main` seadistuse, vajadusel `Konguta muudatused` töölehe ning broneeringute tabelisse `Toimingu ID` veeru. Sisu võetakse esimesel lugemisel üle senisest KRM1 kirjest; olemasolevaid kalendrikirjeid ei kustutata.

## Graafiku sisestusabiline

„Täida vorm tekstist” tunneb näiteks lause:

> Kavalik neljapäeviti 19.30–21.30, hooaeg 2026/27. Välja arvatud 24.12.2026, 31.12.2026.

See töötab kohalikult ega saada teksti välisele AI-teenusele. Puuduvaid kellaaegu ei oletata.

Valikuline päris AI-abiline ilmub, kui Apps Scripti **Project Settings → Script Properties** hulgas on `OPENAI_API_KEY`. Võtit ei tohi lisada GitHubi ega brauseri koodi. `OPENAI_MODEL` on valikuline; vaikemudel on `gpt-4.1-mini`.

AI kasutab Responses API struktureeritud väljundit, `store:false` ja kasutajapõhist päringupiirangut. Teenusele saadetakse kasutaja sisestatud graafikukirjeldus, kuupäev ja talle lubatud kollektiivide nimed/ID-d. Olemasolevaid broneeringuid ega kliendikontakte ei saadeta. AI koostab vormi mustandi, mitte iseseisva kalendritoimingu. AI kasutamine eeldab toimivat API kontot ja selle hinnakirja; võtit ega tasulist teenust uuendus automaatselt ei loo. Lahendus ei treeni iseseisvalt mudelit.

## Arendus ja kontrollid

Staatiline `index.html` ning `konguta-admin.js`; ehitamist ega npm-pakette pole vaja. GitHub Actions avaldab `main` muudatused Pagesi.

- Frontendi kontrollid: `node tests/admin.test.cjs`.
- Serveri kontrollid on ettevalmistatud koos kohaliku serveriuuendusega ja käivitatavad käsuga `node google/tests/konguta-admin.test.cjs`.
- Kontrollid kasutavad mälus näidisandmeid, ei kirjuta päris kalendrisse ega saada päris kirju.
- POST kasutab operatsiooni ID-d. Tulemuse korduv lugemine ja sama toimingu uuesti saatmine ei lisa topeltgraafikut. Seeria muutmise eelvaate revisjon kaitseb vahepealse muutmise eest.

Automaatkontrollid katavad kordused üle suve-/talveaja vahetuse, erandid, duplikaadid, konfliktid, ühe tunni puhvri, koondkirjade arvu, rollid, privaatsuse, hinnad ja seeria tühistamise/taastamise. Google'i tegelikku juurutust ja valikulist AI-ühendust tuleb kontrollida pärast serveriosa avaldamist.
