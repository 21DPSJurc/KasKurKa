# Tīmekļa lietojumprogramma "KasKurKa"

## Projekta apraksts
"KasKurKa" ir mājasdarbu un pārbaudes darbu pārvaldības sistēma, kas izstrādāta, lai palīdzētu studentiem efektīvi organizēt mācību procesu, sekot līdzi termiņiem un apmainīties ar informāciju. Lietojumprogramma ļauj studentiem centralizēti apkopot informāciju par mājasdarbiem un gaidāmajiem pārbaudes darbiem, īpaši situācijās, kad informācija tiek sniegta mutiski vai ir izkliedēta dažādās platformās.



## Izmantotās tehnoloģijas
Projektā tiek izmantots:
*   **Frontend (Lietotāja saskarne):**
    *   Vue.js (JavaScript ietvars)
    *   HTML5
    *   CSS3
    *   Axios (bibliotēka HTTP pieprasījumiem)
*   **Backend (Servera daļa):**
    *   Node.js (JavaScript izpildes vide)
    *   Express.js (Node.js ietvars API veidošanai)
*   **Datubāze:**
    *   MongoDB (NoSQL dokumentu orientēta datubāze)
    *   `mongodb` Node.js draiveris (savienojumam ar MongoDB)
*   **Autentifikācija un Drošība:**
    *   JSON Web Tokens (JWT) lietotāju sesiju pārvaldībai
    *   `bcryptjs` (paroļu hešošanai/šifrēšanai)
*   **Citi rīki un bibliotēkas:**
    *   `cors` (Cross-Origin Resource Sharing atļaušanai)
    *   `dotenv` (vides mainīgo pārvaldībai)
    *   `nodemon` (automātiskai servera restartēšanai izstrādes laikā)
    *   `concurrently` (vairāku npm skriptu vienlaicīgai palaišanai)
    *   Font Awesome (ikonu bibliotēka)
    *   Google Fonts (Inter fonts)

## Izmantotie avoti
1. Vue.js documentation. https://vuejs.org/guide/
2. Node.js documentation. https://nodejs.org/en/docs/
3.MongoDB manual. https://www.mongodb.com/docs/manual
4. Github documentation. https://docs.github.com/
5. MongoDB University (MongoDB basics). https://learn.mongodb.com/
6. freeCodeCamp (JavaScript Algorithms and Data Structures). https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures/
7. NPM documentation. https://docs.npmjs.com/
8. freeCodeCamp (Responsive Web Design). https://www.freecodecamp.org/learn/responsive-web-design/
9. Codeacademy (Learn CSS). https://www.codecademy.com/learn/learn-css


## Uzstādīšanas instrukcijas
Lai palaistu projektu lokāli, nepieciešams veikt sekojošas darbības:

1.  **Priekšnosacījumi:**
    *   Uzstādīts [Node.js](https://nodejs.org/) (versija 16.x vai jaunāka ieteicama), kas ietver `npm` (Node Package Manager).
    *   Uzstādīts un palaists [MongoDB](https://www.mongodb.com/try/download/community) serveris. Pārliecinieties, ka tas darbojas uz noklusējuma porta (`27017`) vai attiecīgi pielāgojiet savienojuma virkni `.env` failā.
    *   Uzstādīts [Git](https://git-scm.com/downloads) versiju kontroles sistēma.

2.  **Projekta klonēšana:**
    Atveriet termināli (komandrindu) un izpildiet komandu, lai klonētu repozitoriju:
    ```bash
    git clone <šī_repozitorija_URL>
    ```
    Pēc tam pārejiet uz projekta saknes mapi:
    ```bash
    cd kaskurka
    ```
    Aizvietojiet `<šī_repozitorija_URL>` ar faktisko Git repozitorija adresi.

3.  **Atkarību instalēšana:**
    Terminālī, atrodoties projekta saknes mapē (`kaskurka`), izpildiet komandu:
    ```bash
    npm install
    ```
    Šī komanda instalēs visas nepieciešamās `frontend` (Vue.js) un `backend` (Node.js/Express.js) atkarības, kas definētas `package.json` failā.

4.  **Vides mainīgo konfigurēšana:**
    *   Projekta saknes mapē (`kaskurka`) izveidojiet failu ar nosaukumu `.env` ja tāds jau nepastāv.
    *   Nokopējiet sekojošo saturu `.env` failā un pielāgojiet nepieciešamās vērtības:
        ```env
        # .env faila piemērs
        MONGO_URI=mongodb://localhost:27017/KasKurKaDatabase
        PORT=5000
        JWT_SECRET=JUSU_IPASI_SLEPENA_UN_GARAKA_RANDOM_VIRKNE_KASKURKA_LIETOTNEI_123!@#ABC
        ```
    *   `PORT` ir ports, uz kura darbosies backend serveris (API). Ja ports `5000` ir aizņemts, varat norādīt citu.

5.  **Datubāzes izveide MongoDB:**
    *   Pārliecinieties, ka MongoDB serveris darbojas.
    *   Backend serveris, startējot un veicot pirmo savienojumu, mēģinās izmantot datubāzi ar nosaukumu, kas norādīts `MONGO_URI` (piem., `KasKurKaDatabase`). Ja datubāze neeksistē, MongoDB to izveidos automātiski pie pirmā veiksmīgā savienojuma un datu ierakstīšanas. Arī kolekcijas (piem., `users`, `homeworks`, `tests`, `groups` u.c.) tiks izveidotas automātiski, kad attiecīgie dati tiks pirmoreiz saglabāti.

6.  **Projekta palaišana:**
    Ir divi galvenie veidi, kā palaist projektu lokālai izstrādei:
    *   **Vienlaicīgi (ieteicamais veids izstrādei):**
        Terminālī, atrodoties projekta saknes mapē (`kaskurka`), izpildiet komandu:
        ```bash
        npm run dev
        ```
        Šī komanda vienlaicīgi palaidīs:
        *   Frontend izstrādes serveri (parasti uz `http://localhost:8080`).
        *   Backend API serveri (uz porta, kas norādīts `.env` failā, piem., `http://localhost:5000`). `nodemon` nodrošinās automātisku servera restartēšanu, ja tiks veiktas izmaiņas backend koda failos.
    *   **Atsevišķi (divos termināļos):**
        *   Lai palaistu backend serveri (vienā terminālī):
            ```bash
            npm run server
            ```
        *   Lai palaistu frontend izstrādes serveri (otrā terminālī):
            ```bash
            npm run serve
            ```

7.  **Piekļuve lietotnei:**
    Pēc veiksmīgas palaišanas:
    *   Frontend daļa (lietotāja saskarne) parasti būs pieejama pārlūkprogrammā adresē `http://localhost:8080` (vai citā portā, ja tas ir mainīts vai noklusējuma ports ir aizņemts – sekojiet līdzi termināļa izvadītajai informācijai).
    *   Backend API būs pieejams uz adreses, kas atbilst `.env` failā norādītajam `PORT` (piem., `http://localhost:5000/api/...`).