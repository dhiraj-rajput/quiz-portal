const { MongoClient } = require('mongodb');

const remoteUri = 'mongodb+srv://alluses1033:dj54phantom@cluster0.pot79.mongodb.net/quiz-portal?retryWrites=true&w=majority';

async function testConnection() {
  const client = new MongoClient(remoteUri);
  
  try {
    console.log('🔗 Testing connection to MongoDB Atlas...');
    await client.connect();
    console.log('✅ Successfully connected to MongoDB Atlas!');
    
    const db = client.db('quiz-portal');
    const collections = await db.listCollections().toArray();
    console.log(`📊 Found ${collections.length} collections:`);
    
    for (const col of collections) {
      const count = await db.collection(col.name).countDocuments();
      console.log(`  - ${col.name}: ${count} documents`);
    }
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  } finally {
    await client.close();
  }
}

testConnection();
