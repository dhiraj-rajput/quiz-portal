const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb://localhost:27017/quiz-portal';

async function checkTestResults() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const TestResult = mongoose.model('TestResult', new mongoose.Schema({}, { strict: false }));
    const MockTest = mongoose.model('MockTest', new mongoose.Schema({}, { strict: false }));

    // Get recent test results
    const results = await TestResult.find({}).sort({ submittedAt: -1 }).limit(5);
    console.log('\n📊 Recent Test Results:');
    
    for (const result of results) {
      const test = await MockTest.findById(result.testId);
      console.log(`\nTest Result ID: ${result._id}`);
      console.log(`Test: ${test?.title || 'Unknown'}`);
      console.log(`User ID: ${result.userId}`);
      console.log(`Score: ${result.score}/${test?.totalPoints || 'Unknown'} (${result.percentage}%)`);
      console.log(`Correct Answers: ${result.correctAnswers}/${result.totalQuestions}`);
      console.log(`Attempt: ${result.attemptNumber}`);
      console.log(`Completed: ${result.isCompleted}`);
      console.log(`Test Total Points: ${test?.totalPoints}`);
      
      // Check individual answers
      console.log(`Answers (${result.answers.length}):`);
      result.answers.forEach((answer, index) => {
        console.log(`  Q${index + 1}: Selected=${answer.selectedAnswer}, Correct=${answer.isCorrect}, Points=${answer.pointsEarned}`);
      });
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkTestResults();
