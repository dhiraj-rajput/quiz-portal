const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const localUri = 'mongodb://localhost:27017';
const dbName = 'quiz-portal';
const backupDir = './database-backup';

async function backupDatabase() {
  const client = new MongoClient(localUri);

  try {
    console.log('🔗 Connecting to local MongoDB...');
    await client.connect();
    console.log('✅ Connected to local MongoDB');

    const db = client.db(dbName);

    // Create backup directory
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Get all collections
    const collections = await db.listCollections().toArray();
    console.log(`📊 Found ${collections.length} collections to backup:`);

    for (const { name } of collections) {
      console.log(`📦 Backing up collection: ${name}`);
      
      const data = await db.collection(name).find().toArray();
      const backupFile = path.join(backupDir, `${name}.json`);
      
      fs.writeFileSync(backupFile, JSON.stringify(data, null, 2));
      console.log(`  ✅ Saved ${data.length} documents to ${backupFile}`);
    }

    console.log(`\n🎉 Backup completed! Files saved in: ${path.resolve(backupDir)}`);

  } catch (error) {
    console.error('❌ Error during backup:', error);
  } finally {
    await client.close();
  }
}

console.log('💾 Quiz Portal Database Backup Tool');
console.log('===================================');
backupDatabase().catch(console.error);
