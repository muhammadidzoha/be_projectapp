// Helper query umum untuk mysql2 agar migrasi dari Prisma konsisten & aman.

// Escape karakter wildcard khusus di input user agar tidak merusak pola LIKE.
export const escapeLike = (value) =>
  String(value).replace(/[\\%_]/g, (c) => `\\${c}`);

// Bangun placeholder dinamis untuk klausa IN (...) dan kembalikan string + params.
// Contoh: buildInClause([1,2,3]) -> { clause: "IN (?,?,?)", params: [1,2,3] }
export const buildInClause = (values) => {
  if (!values || values.length === 0) {
    return { clause: "IN (NULL)", params: [] };
  }
  return { clause: `IN (${values.map(() => "?").join(",")})`, params: values };
};

// Bangun LIKE '%value%' dengan nilai yang sudah diescape.
export const like = (value) => `%${escapeLike(value)}%`;
