// utils/pagination.js
module.exports = function getPagination(query) {
  const page = Math.max(parseInt(query.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(query.limit || "100", 10), 1), 1000); // default 100, max 1000
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};
