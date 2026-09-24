const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ message: "Access Denied" });
  }

  const tokenValue = token.split(" ")[1];

  try {
    const decoded = jwt.verify(tokenValue, process.env.JWT_SECRET);
    req.user = decoded
  } catch (err) {
    return res.status(401).json({ message: "Invalid Token" });
  }
  next()
};

module.exports = authMiddleware