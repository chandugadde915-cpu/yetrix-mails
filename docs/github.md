# GitHub Publishing

This workspace is ready to be initialized as a Git repository.

## If You Already Have A GitHub Repo

```bash
git init
git add .
git commit -m "Initial OwnMail platform architecture"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

## If You Need To Create A New Repo

Create an empty GitHub repository first, then use the commands above with that repository URL.

## CI

GitHub Actions will run:

- frontend type-check
- backend type-check
- frontend build
- backend build
