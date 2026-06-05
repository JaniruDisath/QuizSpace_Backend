import PublicQuizAttempt from "../models/PublicQuizAttempt.js";

export async function getGlobalLeaderboard(req, res) {
  try {
    const leaderboard = await PublicQuizAttempt.aggregate([
      {
        $group: {
          _id: "$userEmail",

          userEmail: {
            $first: "$userEmail",
          },

          userName: {
            $first: "$userName",
          },

          totalPoints: {
            $sum: "$pointsEarned",
          },

          totalAttempts: {
            $sum: {
              $ifNull: ["$attemptCount", 1],
            },
          },

          totalDurationSeconds: {
            $sum: {
              $ifNull: [
                "$totalDurationSeconds",
                {
                  $multiply: [
                    {
                      $ifNull: ["$durationSeconds", 0],
                    },
                    {
                      $ifNull: ["$attemptCount", 1],
                    },
                  ],
                },
              ],
            },
          },

          quizzesPlayed: {
            $sum: 1,
          },

          lastPlayedAt: {
            $max: {
              $ifNull: ["$lastAttemptAt", "$updatedAt"],
            },
          },
        },
      },

      {
        $sort: {
          totalPoints: -1,
          totalAttempts: -1,
          totalDurationSeconds: 1,
        },
      },

      {
        $limit: 50,
      },
    ]);

    const rankedLeaderboard = leaderboard.map((leader, index) => ({
      rank: index + 1,
      userEmail: leader.userEmail,
      userName: leader.userName,
      totalPoints: leader.totalPoints || 0,
      totalAttempts: leader.totalAttempts || 0,
      totalDurationSeconds: leader.totalDurationSeconds || 0,
      quizzesPlayed: leader.quizzesPlayed || 0,
      lastPlayedAt: leader.lastPlayedAt,
    }));

    res.status(200).json(rankedLeaderboard);
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