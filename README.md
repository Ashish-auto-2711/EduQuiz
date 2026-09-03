# EduQuiz

A browser-based quiz platform for structured practice across school subjects and chapters, with a growing question bank for Classes 9–12.

## Overview

EduQuiz organizes chapter-wise questions into an accessible learning experience. The repository includes quiz data, database schemas, import utilities, answer-repair tools, and a lightweight frontend suitable for static hosting with an external data service.

## Highlights

| Capability | Description |
| --- | --- |
| Practice experience | Chapter-focused quizzes for school-level subjects |
| Question bank | CSV-based question collections maintained in bulk |
| Data utilities | Seed, repair, clear, and import scripts |
| Deployment | Static frontend configuration with Netlify support |
| Frontend | Plain HTML, CSS, and JavaScript |

## Project structure

```text
index.html                  Application entry point
styles.css                  Global styling
app.js                      Client-side application logic
quiz/                       Chapter-wise CSV question banks
schema.sql                  Database schema
database_fixes.sql          Data repair SQL
import_all_quizzes.js       Bulk question importer
seed_*.js                   Dataset seeding utilities
repair_shuffle_answers.js   Answer-order repair utility
netlify.toml                Netlify deployment configuration
```

## Local setup

Install Node.js 18 or newer, then install the project dependency:

```bash
npm install
npx serve .
```

## Data scripts

Before running data scripts, verify the target database and environment variables. These commands can modify or delete data and should not be pointed at production without a backup.

```bash
npm run seed
npm run clear-db
```

The CSV files are the maintainable source for bulk quiz content. Validate headers, answer indexes, chapter names, and duplicate questions before importing them.

## Deployment

The repository includes Netlify configuration. Configure external database or service credentials through the hosting provider's environment settings. Never commit `.env` files, API keys, service-role keys, or database passwords.

## Content contribution

New questions should be factually checked, mapped to the correct subject and chapter, and reviewed for duplicate wording. Keep CSV formatting consistent and test a representative import before submitting changes.

## License

This project currently has no explicit open-source license. Add a license before accepting external contributions or redistributing the code.
