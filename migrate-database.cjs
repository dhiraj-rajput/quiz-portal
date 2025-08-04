const { MongoClient } = require('mongodb');

// Connection URIs
const localUri = 'mongodb://localhost:27017';
const remoteUri = 'mongodb+srv://alluses1033:dj54phantom@cluster0.pot79.mongodb.net/quiz-portal?retryWrites=true&w=majority';

// Database names
const localDbName = 'quiz-portal'; // Your local database name
const remoteDbName = 'quiz-portal'; // Atlas database name

async function migrateDatabase() {
  const localClient = new MongoClient(localUri);
  const remoteClient = new MongoClient(remoteUri);

  try {
    console.log('🔗 Connecting to local MongoDB...');
    await localClient.connect();
    console.log('✅ Connected to local MongoDB');

    console.log('🔗 Connecting to MongoDB Atlas...');
    await remoteClient.connect();
    console.log('✅ Connected to MongoDB Atlas');

    const localDb = localClient.db(localDbName);
    const remoteDb = remoteClient.db(remoteDbName);

    // Get all collections from local database
    const collections = await localDb.listCollections().toArray();
    console.log(`📊 Found ${collections.length} collections to migrate:`);
    collections.forEach(col => console.log(`  - ${col.name}`));

    if (collections.length === 0) {
      console.log('⚠️ No collections found in local database. Make sure your local database has data.');
      return;
    }

    // Migrate each collection
    for (const { name } of collections) {
      console.log(`\n📦 Migrating collection: ${name}`);
      
      try {
        // Get all documents from local collection
        const localData = await localDb.collection(name).find().toArray();
        console.log(`  Found ${localData.length} documents`);

        if (localData.length > 0) {
          // Check if collection already exists in remote database
          const existingDocs = await remoteDb.collection(name).countDocuments();
          
          if (existingDocs > 0) {
            console.log(`  ⚠️ Collection ${name} already has ${existingDocs} documents in Atlas`);
            console.log(`  🗑️ Clearing existing data in remote collection...`);
            await remoteDb.collection(name).deleteMany({});
          }

          // Insert all documents to remote collection
          console.log(`  📥 Inserting ${localData.length} documents to Atlas...`);
          await remoteDb.collection(name).insertMany(localData);
          console.log(`  ✅ Successfully migrated ${localData.length} documents`);
        } else {
          console.log(`  ⚠️ Collection ${name} is empty, skipping...`);
        }
      } catch (error) {
        console.error(`  ❌ Error migrating collection ${name}:`, error.message);
      }
    }

    console.log('\n🎉 Database migration completed successfully!');
    
    // Verify migration
    console.log('\n🔍 Verifying migration...');
    for (const { name } of collections) {
      const localCount = await localDb.collection(name).countDocuments();
      const remoteCount = await remoteDb.collection(name).countDocuments();
      console.log(`  ${name}: Local(${localCount}) → Atlas(${remoteCount}) ${localCount === remoteCount ? '✅' : '❌'}`);
    }

  } catch (error) {
    console.error('❌ Error during migration:', error);
  } finally {
    console.log('\n🔌 Closing connections...');
    await localClient.close();
    await remoteClient.close();
    console.log('✅ Connections closed');
  }
}

// Show usage instructions
console.log('🚀 Quiz Portal Database Migration Tool');
console.log('=====================================');
console.log('This will migrate your local MongoDB data to Atlas cluster.');
console.log('Local:  mongodb://localhost:27017/quiz-portal');
console.log('Remote: mongodb+srv://alluses1033:***@cluster0.pot79.mongodb.net/quiz-portal');
console.log('');

// Run migration
migrateDatabase().catch(console.error);
