import { getCreatorDashboard, getRecommendations } from "../services/projectService.js";

export const getRecommendationsController = async (req, res) => {
  const data = await getRecommendations({
    userId: req.user.uid,
    limit: req.query.limit,
  });
  res.json({ ok: true, data });
};

export const getCreatorDashboardController = async (req, res) => {
  const data = await getCreatorDashboard({ creatorId: req.user.uid });
  res.json({ ok: true, data });
};

