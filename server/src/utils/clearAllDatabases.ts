import mongoose from 'mongoose';

// Database connections
const cloudMongoURI = 'mongodb+srv://alluses1033:dj54phantom@cluster0.pot79.mongodb.net/quiz-portal';
const localMongoURI = 'mongodb://localhost:27017/quiz-portal';

async function clearDatabase(uri: string, dbName: string) {
  try {
    console.log(`🔗 Connecting to ${dbName}...`);
    await mongoose.connect(uri);
    console.log(`✅ Connected to ${dbName}: ${mongoose.connection.host}`);
    
    // Get all collection names
    const collections = await mongoose.connection.db.collections();
    
    if (collections.length === 0) {
      console.log(`📋 No collections found in ${dbName}`);
    } else {
      console.log(`🗑️ Clearing ${collections.length} collections in ${dbName}...`);
      
      // Drop each collection
      for (const collection of collections) {
        await collection.drop();
        console.log(`  ✅ Dropped collection: ${collection.collectionName}`);
      }
    }
    
    await mongoose.disconnect();
    console.log(`✅ ${dbName} cleared and disconnected\n`);
    
  } catch (error: any) {
    if (error.code === 'ENOTFOUND' || error.message.includes('ECONNREFUSED')) {
      console.log(`⚠️  ${dbName} not accessible (probably not running) - skipping\n`);
    } else if (error.message.includes('ns not found')) {
      console.log(`📋 No collections to clear in ${dbName}\n`);
    } else {
      console.error(`❌ Error clearing ${dbName}:`, error.message);
    }
    
    try {
      await mongoose.disconnect();
    } catch (disconnectError) {
      // Ignore disconnect errors
    }
  }
}

async function clearAllDatabases() {
  console.log('🧹 Starting database cleanup...\n');
  
  // Clear cloud database
  await clearDatabase(cloudMongoURI, 'Cloud MongoDB (MongoDB Atlas)');
  
  // Clear local database  
  await clearDatabase(localMongoURI, 'Local MongoDB');
  
  console.log('🎉 Database cleanup completed!');
}

// Run the cleanup
clearAllDatabases().catch((error) => {
  console.error('❌ Database cleanup failed:', error);
  process.exit(1);
});
