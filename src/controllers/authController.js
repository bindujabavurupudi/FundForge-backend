import { getProfileById, upsertProfile } from "../services/profileService.js";

export const getAuthMe = async (req, res) => {
  const profile = await getProfileById(req.user.uid);
  res.json({
    ok: true,
    data: {
      user: req.user,
      profile,
    },
  });
};

export const bootstrapProfile = async (req, res) => {
  const profile = await upsertProfile(req.user);
  res.status(201).json({ ok: true, data: profile });
};

