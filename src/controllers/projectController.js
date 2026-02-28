import {
  addCommentReply,
  addComment,
  addContribution,
  addProjectUpdate,
  createProject,
  getProjectById,
  listProjects,
  upsertProjectView,
} from "../services/projectService.js";
import { upsertProfile } from "../services/profileService.js";

export const listProjectsController = async (req, res) => {
  const result = await listProjects(req.query);
  res.json({ ok: true, data: result });
};

export const getProjectByIdController = async (req, res) => {
  const project = await getProjectById(req.params.projectId);
  if (!project) {
    return res.status(404).json({ ok: false, error: "Project not found." });
  }
  return res.json({ ok: true, data: project });
};

export const createProjectController = async (req, res) => {
  await upsertProfile(req.user);
  const project = await createProject({ creatorId: req.user.uid, payload: req.body ?? {} });
  res.status(201).json({ ok: true, data: project });
};

export const trackProjectViewController = async (req, res) => {
  await upsertProjectView({ projectId: req.params.projectId, userId: req.user.uid });
  res.status(201).json({ ok: true });
};

export const addContributionController = async (req, res) => {
  const project = await addContribution({
    projectId: req.params.projectId,
    backerId: req.user.uid,
    amount: req.body?.amount,
  });

  if (!project) {
    return res.status(404).json({ ok: false, error: "Project not found." });
  }
  return res.status(201).json({ ok: true, data: project });
};

export const addCommentController = async (req, res) => {
  const comment = await addComment({
    projectId: req.params.projectId,
    userId: req.user.uid,
    text: req.body?.text,
  });
  res.status(201).json({ ok: true, data: comment });
};

export const addCommentReplyController = async (req, res) => {
  const reply = await addCommentReply({
    commentId: req.params.commentId,
    userId: req.user.uid,
    text: req.body?.text,
  });
  res.status(201).json({ ok: true, data: reply });
};

export const addProjectUpdateController = async (req, res) => {
  const update = await addProjectUpdate({
    projectId: req.params.projectId,
    userId: req.user.uid,
    title: req.body?.title,
    content: req.body?.content,
  });

  if (!update) {
    return res.status(404).json({ ok: false, error: "Project not found." });
  }
  return res.status(201).json({ ok: true, data: update });
};
