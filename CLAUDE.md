# General instructions
- Do not make any "write" git actions, unless specifically asked for, and even in those cases pop up an explicit "are you sure" question (this includes staging, stashing, commits, pushes, pulls, etc). Checking and reading the git log is of course okay.

# Angular preferences
- Use the Angular CLI where applicable (eg when creating a new service)
- I don't need unit testing files

# About the app
- When making changes to how data is stored, do your best to avoid changes that would lead to data loss after a deploy (ie, the strucutre changes in a way that the newly deployed version is incompatible with the data that was stored by the older version). If it can't be avoided, drop a gigantic warning about that.