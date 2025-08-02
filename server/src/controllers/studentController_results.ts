// @desc    Get test results for student
// @route   GET /api/student/results
// @access  Private (Student only)
export const getStudentResults = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Get test results for the student
    const testResults = await TestResult.find({
      userId: userId,
      isCompleted: true,
    })
      .populate('testId', 'title description totalQuestions')
      .populate('assignmentId', 'dueDate maxAttempts')
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const totalCount = await TestResult.countDocuments({
      userId: userId,
      isCompleted: true,
    });

    const totalPages = Math.ceil(totalCount / limit);

    res.status(200).json({
      success: true,
      data: {
        results: testResults,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
