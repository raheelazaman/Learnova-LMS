// GET /api/user/data  and  GET /api/auth/me
export const getUserData = (req, res) => {
  res.json({ success: true, user: req.user });
};
