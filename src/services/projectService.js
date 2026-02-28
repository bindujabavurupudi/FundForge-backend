import { supabase } from "../lib/supabase.js";

const allowedSortFields = {
  newest: { column: "created_at", ascending: false },
  popular: { column: "backers_count", ascending: false },
  funded: { column: "raised_amount", ascending: false },
  ending: { column: "deadline", ascending: true },
};

const normalizeSort = (sort) => allowedSortFields[sort] ?? allowedSortFields.popular;

export const listProjects = async ({
  search = "",
  category,
  minGoal,
  maxGoal,
  sort = "popular",
  page = 1,
  limit = 12,
}) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 12, 1), 50);
  const safePage = Math.max(Number(page) || 1, 1);
  const from = (safePage - 1) * safeLimit;
  const to = from + safeLimit - 1;
  const sortConfig = normalizeSort(sort);

  let query = supabase
    .from("projects")
    .select("*, creator:profiles!projects_creator_id_fkey(name)", { count: "exact" })
    .order(sortConfig.column, { ascending: sortConfig.ascending })
    .range(from, to);

  if (search) {
    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
  }
  if (category && category !== "All") {
    query = query.eq("category", category);
  }
  if (Number.isFinite(Number(minGoal)) && Number(minGoal) > 0) {
    query = query.gte("goal_amount", Number(minGoal));
  }
  if (Number.isFinite(Number(maxGoal)) && Number(maxGoal) > 0) {
    query = query.lte("goal_amount", Number(maxGoal));
  }

  const { data, error, count } = await query;
  if (error) {
    throw new Error(`Failed to fetch projects: ${error.message}`);
  }

  return {
    items: data ?? [],
    page: safePage,
    limit: safeLimit,
    total: count ?? 0,
  };
};

export const getProjectById = async (projectId) => {
  const { data: project, error } = await supabase
    .from("projects")
    .select("*, creator:profiles!projects_creator_id_fkey(name)")
    .eq("id", projectId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load project: ${error.message}`);
  }
  if (!project) {
    return null;
  }

  const [rewardsRes, milestonesRes, commentsRes, repliesRes, updatesRes] = await Promise.all([
    supabase.from("project_rewards").select("*").eq("project_id", projectId).order("amount", { ascending: true }),
    supabase.from("project_milestones").select("*").eq("project_id", projectId).order("sequence", { ascending: true }),
    supabase
      .from("comments")
      .select("*, user:profiles!comments_user_id_fkey(name)")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false }),
    supabase
      .from("comment_replies")
      .select("*, user:profiles!comment_replies_user_id_fkey(name), comment:comments!comment_replies_comment_id_fkey(id, project_id)")
      .order("created_at", { ascending: true }),
    supabase.from("project_updates").select("*").eq("project_id", projectId).order("created_at", { ascending: false }),
  ]);

  if (rewardsRes.error || milestonesRes.error || commentsRes.error || repliesRes.error || updatesRes.error) {
    const firstError = rewardsRes.error || milestonesRes.error || commentsRes.error || repliesRes.error || updatesRes.error;
    throw new Error(`Failed to load related project data: ${firstError.message}`);
  }

  const initialsFromName = (name = "User") =>
    name
      .split(" ")
      .map((part) => part[0] ?? "")
      .join("")
      .slice(0, 2)
      .toUpperCase();

  const repliesByCommentId = (repliesRes.data ?? [])
    .filter((reply) => reply.comment?.project_id === projectId)
    .reduce((acc, reply) => {
      const item = {
        id: reply.id,
        user: reply.user?.name ?? "User",
        avatar: initialsFromName(reply.user?.name ?? "User"),
        text: reply.text,
        date: reply.created_at,
      };
      const key = reply.comment_id;
      acc[key] = [...(acc[key] ?? []), item];
      return acc;
    }, {});

  const normalizedComments = (commentsRes.data ?? []).map((comment) => ({
    id: comment.id,
    user: comment.user?.name ?? "User",
    avatar: initialsFromName(comment.user?.name ?? "User"),
    text: comment.text,
    date: comment.created_at,
    replies: repliesByCommentId[comment.id] ?? [],
  }));

  const normalizedUpdates = (updatesRes.data ?? []).map((update) => ({
    id: update.id,
    title: update.title,
    content: update.content,
    date: update.created_at,
  }));

  return {
    ...project,
    rewards: rewardsRes.data ?? [],
    milestones: milestonesRes.data ?? [],
    comments: normalizedComments,
    updates: normalizedUpdates,
  };
};

export const createProject = async ({ creatorId, payload }) => {
  const projectPayload = {
    title: payload.title?.trim(),
    description: payload.description?.trim(),
    category: payload.category,
    image_url: payload.imageUrl ?? null,
    goal_amount: Number(payload.goalAmount),
    raised_amount: 0,
    backers_count: 0,
    deadline: payload.deadline,
    creator_id: creatorId,
  };

  const { data: project, error } = await supabase
    .from("projects")
    .insert(projectPayload)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to create project: ${error.message}`);
  }

  const rewards = Array.isArray(payload.rewards) ? payload.rewards : [];
  const milestones = Array.isArray(payload.milestones) ? payload.milestones : [];

  if (rewards.length > 0) {
    const rewardPayload = rewards.map((reward) => ({
      project_id: project.id,
      title: reward.title,
      description: reward.description ?? null,
      amount: Number(reward.amount),
    }));
    const { error: rewardError } = await supabase.from("project_rewards").insert(rewardPayload);
    if (rewardError) {
      throw new Error(`Failed to create rewards: ${rewardError.message}`);
    }
  }

  if (milestones.length > 0) {
    const milestonePayload = milestones.map((milestone, index) => ({
      project_id: project.id,
      title: milestone.title,
      description: milestone.description ?? null,
      target_amount: Number(milestone.targetAmount),
      sequence: index + 1,
      reached: false,
    }));
    const { error: milestoneError } = await supabase.from("project_milestones").insert(milestonePayload);
    if (milestoneError) {
      throw new Error(`Failed to create milestones: ${milestoneError.message}`);
    }
  }

  return project;
};

export const addContribution = async ({ projectId, backerId, amount }) => {
  const safeAmount = Number(amount);
  if (!Number.isFinite(safeAmount) || safeAmount <= 0) {
    throw new Error("Contribution amount must be greater than 0.");
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError) {
    throw new Error(`Failed to load project: ${projectError.message}`);
  }
  if (!project) {
    return null;
  }

  const remaining = Math.max(Number(project.goal_amount) - Number(project.raised_amount), 0);
  if (safeAmount > remaining) {
    throw new Error(`Contribution cannot exceed remaining goal amount (${remaining}).`);
  }

  const { data: priorContribution, error: priorError } = await supabase
    .from("contributions")
    .select("id")
    .eq("project_id", projectId)
    .eq("backer_id", backerId)
    .limit(1)
    .maybeSingle();

  if (priorError) {
    throw new Error(`Failed to verify contribution history: ${priorError.message}`);
  }

  const { error: contributionError } = await supabase.from("contributions").insert({
    project_id: projectId,
    backer_id: backerId,
    amount: safeAmount,
    status: "succeeded",
  });

  if (contributionError) {
    throw new Error(`Failed to save contribution: ${contributionError.message}`);
  }

  const projectUpdate = {
    raised_amount: Number(project.raised_amount) + safeAmount,
    backers_count: priorContribution ? Number(project.backers_count) : Number(project.backers_count) + 1,
  };

  const { data: updatedProject, error: projectUpdateError } = await supabase
    .from("projects")
    .update(projectUpdate)
    .eq("id", projectId)
    .select("*")
    .single();

  if (projectUpdateError) {
    throw new Error(`Failed to update project totals: ${projectUpdateError.message}`);
  }

  return updatedProject;
};

export const addComment = async ({ projectId, userId, text }) => {
  const cleanText = text?.trim();
  if (!cleanText) {
    throw new Error("Comment text is required.");
  }

  const { data, error } = await supabase
    .from("comments")
    .insert({
      project_id: projectId,
      user_id: userId,
      text: cleanText,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to post comment: ${error.message}`);
  }

  return data;
};

export const addCommentReply = async ({ commentId, userId, text }) => {
  const cleanText = text?.trim();
  if (!cleanText) {
    throw new Error("Reply text is required.");
  }

  const { data, error } = await supabase
    .from("comment_replies")
    .insert({
      comment_id: commentId,
      user_id: userId,
      text: cleanText,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to post reply: ${error.message}`);
  }

  return data;
};

export const addProjectUpdate = async ({ projectId, userId, title, content }) => {
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, creator_id")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError) {
    throw new Error(`Failed to validate project owner: ${projectError.message}`);
  }
  if (!project) {
    return null;
  }
  if (project.creator_id !== userId) {
    const err = new Error("Only the project creator can publish updates.");
    err.statusCode = 403;
    throw err;
  }

  const { data, error } = await supabase
    .from("project_updates")
    .insert({
      project_id: projectId,
      title: title?.trim(),
      content: content?.trim(),
      author_id: userId,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to publish update: ${error.message}`);
  }

  return data;
};

export const upsertProjectView = async ({ projectId, userId }) => {
  const { error } = await supabase.from("project_views").insert({
    project_id: projectId,
    user_id: userId,
  });
  if (error) {
    throw new Error(`Failed to track project view: ${error.message}`);
  }
};

export const getRecommendations = async ({ userId, limit = 3 }) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 3, 1), 12);

  const { data: viewedRows, error: viewedError } = await supabase
    .from("project_views")
    .select("project_id, projects(category)")
    .eq("user_id", userId)
    .limit(50);

  if (viewedError) {
    throw new Error(`Failed to read project view history: ${viewedError.message}`);
  }

  const { data: fundedRows, error: fundedError } = await supabase
    .from("contributions")
    .select("project_id")
    .eq("backer_id", userId)
    .eq("status", "succeeded")
    .limit(50);

  if (fundedError) {
    throw new Error(`Failed to read contribution history: ${fundedError.message}`);
  }

  const excludedProjectIds = new Set((fundedRows ?? []).map((row) => row.project_id));
  const categoryScore = {};

  for (const row of viewedRows ?? []) {
    const category = row.projects?.category;
    if (!category) continue;
    categoryScore[category] = (categoryScore[category] ?? 0) + 1;
  }

  const { data: projects, error: projectsError } = await supabase
    .from("projects")
    .select("*")
    .limit(200);

  if (projectsError) {
    throw new Error(`Failed to read projects for recommendations: ${projectsError.message}`);
  }

  const ranked = (projects ?? [])
    .filter((project) => !excludedProjectIds.has(project.id))
    .map((project) => {
      const interest = categoryScore[project.category] ?? 0;
      const popularity = Number(project.backers_count ?? 0) / 200;
      const fundingRatio = Number(project.raised_amount ?? 0) / Math.max(Number(project.goal_amount ?? 1), 1);
      return {
        project,
        score: interest * 3 + popularity + fundingRatio,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, safeLimit)
    .map((entry) => entry.project);

  return ranked;
};

export const getCreatorDashboard = async ({ creatorId }) => {
  const { data: projects, error } = await supabase
    .from("projects")
    .select("*")
    .eq("creator_id", creatorId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load creator projects: ${error.message}`);
  }

  const list = projects ?? [];
  const totalFunds = list.reduce((sum, project) => sum + Number(project.raised_amount ?? 0), 0);
  const totalBackers = list.reduce((sum, project) => sum + Number(project.backers_count ?? 0), 0);

  const projectIds = list.map((project) => project.id);
  let totalViews = 0;

  if (projectIds.length > 0) {
    const { count, error: viewsError } = await supabase
      .from("project_views")
      .select("id", { count: "exact", head: true })
      .in("project_id", projectIds);
    if (viewsError) {
      throw new Error(`Failed to load project views: ${viewsError.message}`);
    }
    totalViews = count ?? 0;
  }

  return {
    totals: {
      projects: list.length,
      totalFunds,
      totalBackers,
      totalViews,
      engagementRate: totalViews > 0 ? Math.round((totalBackers / totalViews) * 100) : 0,
    },
    projects: list,
  };
};
