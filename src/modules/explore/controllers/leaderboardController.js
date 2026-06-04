import User from "../../../modules/users/models/User.js";
import PublicQuizAttempt from "../models/PublicQuizAttempt.js";

export async function getGlobalLeaderboard(req, res) {
  try {
    const users = await User.find({
      "publicStats.totalPoints": { $gt: 0 },
    })
      .sort({ "publicStats.totalPoints": -1 })
      .limit(50);

    const leaderboard = users.map((user, index) => ({
      rank: index + 1,
      userEmail: user.email,
      userName: user.fullName,
      totalPoints: user.publicStats?.totalPoints || 0,
      publicQuizzesAttempted: user.publicStats?.publicQuizzesAttempted || 0,
      publicQuizzesPublished: user.publicStats?.publicQuizzesPublished || 0,
    }));

    res.status(200).json(leaderboard);
  } catch (error) {
    console.error("Error in getGlobalLeaderboard controller", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
export async function getQuizLeaderboard(req, res) {
  try {
    const attempts = await PublicQuizAttempt.find({
      publicQuizId: req.params.publicQuizId,
    })
      .sort({
        score: -1,
        durationSeconds: 1,
        updatedAt: -1,
      })
      .limit(50);

    const leaderboard = attempts.map((attempt, index) => ({
      rank: index + 1,
      attemptId: attempt._id,
      userEmail: attempt.userEmail,
      userName: attempt.userName,
      score: attempt.score,
      totalQuestions: attempt.totalQuestions,
      percentage: attempt.percentage,
      pointsEarned: attempt.pointsEarned,
      durationSeconds: attempt.durationSeconds,
      attemptCount: attempt.attemptCount,
      bestAttemptAt: attempt.bestAttemptAt,
      lastAttemptAt: attempt.lastAttemptAt,
      createdAt: attempt.createdAt,
      updatedAt: attempt.updatedAt,
    }));

    res.status(200).json(leaderboard);
  } catch (error) {
    console.error("Error in getQuizLeaderboard controller", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}