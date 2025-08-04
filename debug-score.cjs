const mongoose = require('mongoose');
require('dotenv').config({ path: './server/.env' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/quiz-portal';

async function checkTestAndResults() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const TestResult = mongoose.model('TestResult', new mongoose.Schema({}, { strict: false }));
    const MockTest = mongoose.model('MockTest', new mongoose.Schema({}, { strict: false }));

    // Find the specific test result that's causing issues
    const results = await TestResult.find({}).sort({ submittedAt: -1 }).limit(3);
    
    for (const result of results) {
      const test = await MockTest.findById(result.testId);
      
      console.log(`\n=== Test Result Analysis ===`);
      console.log(`Test: ${test?.title || 'Unknown'}`);
      console.log(`Score: ${result.score}/${test?.totalPoints || 'Unknown'} = ${result.percentage}%`);
      console.log(`Correct Answers: ${result.correctAnswers}/${result.totalQuestions}`);
      
      if (test) {
        console.log(`\nTest Questions and Points:`);
        let calculatedTotalPoints = 0;
        test.questions.forEach((q, index) => {
          console.log(`  Q${index + 1}: ${q.points} points - "${q.question.substring(0, 50)}..."`);
          calculatedTotalPoints += q.points;
        });
        console.log(`Calculated Total Points: ${calculatedTotalPoints}`);
        console.log(`Stored Total Points: ${test.totalPoints}`);
        
        // Manual percentage calculation
        const manualPercentage = (result.score / calculatedTotalPoints) * 100;
        console.log(`Manual Percentage Calculation: ${result.score}/${calculatedTotalPoints} = ${manualPercentage.toFixed(2)}%`);
      }
      
      console.log(`\nAnswer Details:`);
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

checkTestAndResults();
