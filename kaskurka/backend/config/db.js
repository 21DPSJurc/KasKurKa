const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');
const path = require('path'); // Importē 'path' moduli, kas palīdz darbā ar failu ceļiem.

// Izveido absolūto ceļu uz .env failu.
// __dirname norāda uz pašreizējā moduļa (kaskurka/backend/config/) direktoriju.
const envPath = path.resolve(__dirname, '../../.env');

// Ielādē vides mainīgos no norādītā ceļa.
const envConfigResult = dotenv.config({ path: envPath });

console.log('[db.js] Mēģina ielādēt .env failu no:', envPath);

if (envConfigResult.error) {
  console.error('[db.js] KĻŪDA, ielādējot .env failu:', envConfigResult.error);
} else {
  console.log('[db.js] .env fails ielādēts. Apstrādātais saturs (ja ir):', envConfigResult.parsed);
}

const uri = process.env.MONGO_URI; // MongoDB pieslēguma URI, ielādēts no vides mainīgajiem.
console.log('[db.js] MONGO_URI vērtība no process.env:', uri);

// Pārbauda, vai MONGO_URI ir definēts. Ja nē, lietotne nevarēs izveidot savienojumu ar datubāzi.
if (!uri) {
  console.error('[db.js] KRITISKI: MONGO_URI nav definēts. Lietotne nevar izveidot savienojumu ar datubāzi.');
  console.error('[db.js] Lūdzu, pārliecinieties, ka .env fails pastāv projekta saknes direktorijā (kaskurka/.env) un satur MONGO_URI mainīgo.');
  process.exit(1); // Pārtrauc procesu, ja URI nav atrasts, jo lietotne nevar darboties.
}

const client = new MongoClient(uri); // Izveido jaunu MongoDB klientu, izmantojot pieslēguma URI.

let db; // Mainīgais, kurā glabāsies datubāzes instance.

// Asinhrona funkcija, kas izveido savienojumu ar MongoDB.
const connectDB = async () => {
  // Ja savienojums jau pastāv, atgriež esošo datubāzes instanci.
  if (db) {
    return db;
  }
  // Papildu drošības pārbaude, vai URI ir definēts pirms savienojuma mēģinājuma.
  if (!uri) {
    console.error('[connectDB] MongoDB savienojuma kļūda: MONGO_URI nav definēts savienojuma mēģinājuma brīdī.');
    process.exit(1); // Pārtrauc procesu.
  }
  try {
    await client.connect(); // Izveido savienojumu ar MongoDB serveri.
    console.log('MongoDB savienots...');
    // Ja MONGO_URI ietver datubāzes nosaukumu, client.db() ir pietiekami.
    // Pretējā gadījumā jānorāda datubāzes nosaukums, piemēram, client.db("KasKurKaDatabase").
    // Šeit tiek pieņemts, ka datubāzes nosaukums ir daļa no URI vai tiek izmantota noklusējuma datubāze.
    db = client.db();
    return db; // Atgriež datubāzes instanci.
  } catch (err) {
    console.error('MongoDB savienojuma kļūda client.connect() laikā:', err.message);
    console.error('Pilns kļūdas objekts:', err); // Detalizētākai kļūdas informācijai.
    process.exit(1); // Pārtrauc procesu kļūmes gadījumā.
  }
};

// Funkcija, kas atgriež aktīvo datubāzes instanci.
const getDB = () => {
  // Pārbauda, vai datubāze ir inicializēta.
  // Šī kļūda ideālā gadījumā nenotiks, ja connectDB ir izsaukta un MONGO_URI ir iestatīts.
  // Ja tā notiek, tas nozīmē, ka connectDB neizdevās vai netika izsaukta.
  if (!db) {
    console.error('[getDB] Kļūda: Datubāze nav inicializēta. MONGO_URI varētu trūkt vai savienojums neizdevās.');
    throw new Error('Datubāze nav inicializēta. Vispirms izsauciet connectDB un pārliecinieties, ka MONGO_URI ir iestatīts.');
  }
  return db; // Atgriež datubāzes instanci.
};

// Eksportē funkcijas, lai tās varētu izmantot citos moduļos.
module.exports = { connectDB, getDB };