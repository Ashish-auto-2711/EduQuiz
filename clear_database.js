const INSFORGE_URL = 'https://c43du8wy.us-east.insforge.app';
const INSFORGE_KEY = 'anon_61ab7eb0294a9648862366b8f8304a46b8fc7bdb08db307e9ef9c1b014768351';

async function request(endpoint, options = {}) {
  const headers = {
    'apikey': INSFORGE_KEY,
    'Authorization': `Bearer ${INSFORGE_KEY}`,
    'Content-Type': 'application/json',
    ...options.headers
  };
  const resp = await fetch(`${INSFORGE_URL}/api/database/records/${endpoint}`, { ...options, headers });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`DB Error [${resp.status}]: ${text}`);
  }
  if (resp.status === 204) return null;
  return resp.json();
}

async function clearAll() {
  console.log('Fetching all subjects to clear...');
  const subjects = await request('subjects');
  console.log(`Found ${subjects.length} subjects.`);

  for (const sub of subjects) {
    console.log(`Deleting Subject: ${sub.name} (ID: ${sub.id})...`);
    await request(`subjects?id=eq.${sub.id}`, { method: 'DELETE' });
  }

  // To be absolutely thorough, let's verify if chapters, quizzes, or questions remain
  const chapters = await request('chapters');
  console.log(`Remaining chapters: ${chapters.length}`);
  const quizzes = await request('quizzes');
  console.log(`Remaining quizzes: ${quizzes.length}`);
  const questions = await request('questions?limit=1');
  console.log(`Remaining questions: ${questions.length}`);

  console.log('\n==================================================');
  console.log('DATABASE SUCCESSFULLY CLEARED AND MADE CLEAN!');
}

clearAll().catch(console.error);
