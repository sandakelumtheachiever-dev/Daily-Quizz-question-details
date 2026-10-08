# Quiz Bank - setup (all in browser)
1. GitHub: new repo -> upload all unzipped files (Add file > Upload files) -> Commit.
2. Vercel: Add New > Project > import repo (don't deploy yet, or redeploy later).
3. Vercel project > Storage > Create > Neon (Postgres) > connect to project. It adds DATABASE_URL automatically.
4. Vercel > Settings > Environment Variables, add: GEMINI_API_KEY (free key from aistudio.google.com), USER_PASSWORD, ADMIN_PASSWORD, SECRET (any long random text).
5. Deployments > Redeploy. Open the site. Tables are created automatically.

