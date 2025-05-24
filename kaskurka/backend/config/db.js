const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');
const path = require('path'); // Import the 'path' module

// Construct the absolute path to the .env file
// __dirname is the directory of the current module (kaskurka/backend/config/)
const envPath = path.resolve(__dirname, '../../.env');

// Load environment variables from the specified path
const envConfigResult = dotenv.config({ path: envPath });

console.log('[db.js] Attempting to load .env file from:', envPath);

if (envConfigResult.error) {
  console.error('[db.js] ERROR loading .env file:', envConfigResult.error);
} else {
  console.log('[db.js] .env file loaded. Parsed content (if any):', envConfigResult.parsed);
}

const uri = process.env.MONGO_URI;
console.log('[db.js] Value of MONGO_URI from process.env:', uri);

if (!uri) {
  console.error('[db.js] CRITICAL: MONGO_URI is undefined. The application cannot connect to the database.');
  console.error('[db.js] Please ensure the .env file exists at the project root (kaskurka/.env) and contains the MONGO_URI variable.');
  process.exit(1); // Exit if URI is not found, as the app can't run
}

const client = new MongoClient(uri); // This line was failing

let db;

const connectDB = async () => {
  if (db) {
    return db;
  }
  // uri check is already done above, but a defensive check here is fine
  if (!uri) {
    console.error('[connectDB] MongoDB Connection Error: MONGO_URI is not defined at connection attempt.');
    process.exit(1);
  }
  try {
    await client.connect();
    console.log('MongoDB Connected...');
    // If your MONGO_URI includes the DB name, client.db() is fine.
    // Otherwise, you'd use client.db("KasKurKaDatabase")
    db = client.db(); 
    return db;
  } catch (err) {
    console.error('MongoDB Connection Error during client.connect():', err.message);
    console.error('Full error object:', err); // Log the full error object for more details
    process.exit(1); // Exit process with failure
  }
};

const getDB = () => {
  if (!db) {
    // This error should ideally not be hit if connectDB is called and MONGO_URI is set.
    // If it is, it means connectDB failed or wasn't called.
    console.error('[getDB] Error: Database not initialized. MONGO_URI might be missing or connection failed.');
    throw new Error('Database not initialized. Call connectDB first and ensure MONGO_URI is set.');
  }
  return db;
};

module.exports = { connectDB, getDB };