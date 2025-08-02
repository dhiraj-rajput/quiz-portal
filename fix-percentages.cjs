const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb://localhost:27017/quiz-portal';

async function fixExistingResults() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const TestResult = mongoose.model('TestResult', new mongoose.Schema({}, { strict: false }));
    const MockTest = mongoose.model('MockTest', new mongoose.Schema({}, { strict: false }));

    // Get all test results
    const results = await TestResult.find({});
    console.log(`Found ${results.length} test results to check`);

    let fixedCount = 0;

    for (const result of results) {
      const test = await MockTest.findById(result.testId);
      
      if (test) {
        // Recalculate the correct percentage
        const correctPercentage = test.totalPoints > 0 ? Math.round((result.score / test.totalPoints) * 100) : 0;
        
        if (result.percentage !== correctPercentage) {
          console.log(`\nFixing result ${result._id}:`);
          console.log(`  Test: ${test.title}`);
          console.log(`  Score: ${result.score}/${test.totalPoints}`);
          console.log(`  Old percentage: ${result.percentage}%`);
          console.log(`  New percentage: ${correctPercentage}%`);
          
          // Update the result
          await TestResult.updateOne(
            { _id: result._id },
            { $set: { percentage: correctPercentage } }
          );
          
          fixedCount++;
        }
      }
    }

    console.log(`\n✅ Fixed ${fixedCount} test results with incorrect percentages`);
    
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixExistingResults();
