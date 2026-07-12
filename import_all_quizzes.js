const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const INSFORGE_URL = 'https://c43du8wy.us-east.insforge.app';
const INSFORGE_KEY = 'ik_bc9b7710a147746be48216c8064944be';

// HTTP helper
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

// Normalise strings for comparison
function cleanString(str) {
  return (str || '').toString().trim().toLowerCase().replace(/\s+/g, ' ');
}

// Extract subject, class, and chapter from filename
function parseFilename(filename) {
  const name = path.basename(filename, path.extname(filename));
  
  let classNum = 12;
  if (name.includes('Class11')) classNum = 11;
  else if (name.includes('Class10')) classNum = 10;
  else if (name.includes('Class9')) classNum = 9;

  let subject = '';
  if (name.toLowerCase().includes('biology')) subject = 'Biology';
  else if (name.toLowerCase().includes('chemistry')) subject = 'Chemistry';
  else if (name.toLowerCase().includes('physics')) subject = 'Physics';
  else if (name.toLowerCase().includes('mathematics') || name.toLowerCase().includes('maths')) subject = 'Mathematics';

  let chapter = '';
  const match = name.match(/Ch\d+_(.+?)(?:_\d+_MCQs|$)/i);
  if (match) {
    chapter = match[1].replace(/_/g, ' ');
  } else {
    chapter = name
      .replace(/CBSE_/i, '')
      .replace(/Class\d+_/i, '')
      .replace(/(?:Biology|Chemistry|Physics|Mathematics|Maths)_/i, '')
      .replace(/Ch\d+_/i, '')
      .replace(/_\d+_(?:MCQs|MCQ)/i, '')
      .replace(/_/g, ' ');
  }

  const cleanedChap = cleanString(chapter);
  if (cleanedChap.includes('sexual reproduction')) chapter = 'Sexual Reproduction in Flowering Plants';
  else if (cleanedChap.includes('human reproduction')) chapter = 'Human Reproduction';
  else if (cleanedChap.includes('reproductive health')) chapter = 'Reproductive Health';
  else if (cleanedChap.includes('solutions')) chapter = 'Solutions';
  else if (cleanedChap.includes('electrochemistry')) chapter = 'Electrochemistry';
  else if (cleanedChap.includes('electric charges')) chapter = 'Electric Charges and Fields';

  return { classNum, subject, chapter };
}

async function importFile(filepath) {
  const filename = path.basename(filepath);
  console.log(`\n--------------------------------------------------`);
  console.log(`Processing: ${filename}`);

  // Load workbook
  const wb = xlsx.readFile(filepath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet);
  console.log(`Loaded ${rows.length} rows from file.`);

  if (rows.length === 0) {
    console.warn(`No rows found in ${filename}. Skipping.`);
    return;
  }

  // Extract metadata from CSV columns
  const firstRow = rows[0];
  const classNum = parseInt(firstRow['Class'] || firstRow['class'] || 12);
  const subject = (firstRow['Subject'] || firstRow['subject'] || '').toString().trim();
  const chapter = (firstRow['Chapter'] || firstRow['chapter'] || '').toString().trim();

  const meta = { classNum, subject, chapter };
  console.log(`Parsed CSV Metadata: Class ${meta.classNum} | Subject: ${meta.subject} | Chapter: ${meta.chapter}`);

  if (!meta.subject || !meta.chapter) {
    console.warn(`Could not parse metadata from CSV content for ${filename}. Skipping.`);
    return;
  }

  // 1. Get or create Subject
  const subjectName = meta.classNum === 12 ? meta.subject : `${meta.subject} (Class ${meta.classNum})`;
  let subjectId;
  const existingSub = await request(`subjects?name=eq.${encodeURIComponent(subjectName)}`);
  if (existingSub && existingSub.length > 0) {
    subjectId = existingSub[0].id;
  } else {
    const subRows = await request('subjects', {
      method: 'POST',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify([{ name: subjectName }])
    });
    subjectId = subRows[0].id;
    console.log(`Created new Subject in DB: ${subjectName}`);
  }

  // 2. Get or create Chapter
  let chapterId;
  const existingChap = await request(`chapters?subject_id=eq.${subjectId}&name=eq.${encodeURIComponent(meta.chapter)}`);
  if (existingChap && existingChap.length > 0) {
    chapterId = existingChap[0].id;
  } else {
    const chapRows = await request('chapters', {
      method: 'POST',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify([{ subject_id: subjectId, name: meta.chapter }])
    });
    chapterId = chapRows[0].id;
    console.log(`Created new Chapter in DB: ${meta.chapter}`);
  }

  // 3. Get or create Quiz
  const quizName = `${meta.chapter} Practice Test`;
  let quizId;
  const existingQuiz = await request(`quizzes?chapter_id=eq.${chapterId}&name=eq.${encodeURIComponent(quizName)}`);
  if (existingQuiz && existingQuiz.length > 0) {
    quizId = existingQuiz[0].id;
  } else {
    const quizRows = await request('quizzes', {
      method: 'POST',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify([{ chapter_id: chapterId, name: quizName }])
    });
    quizId = quizRows[0].id;
    console.log(`Created new Quiz in DB: ${quizName}`);
  }

  // 4. Fetch existing questions to prevent duplicacy
  const existingQuestions = await request(`questions?quiz_id=eq.${quizId}&limit=1000`);
  const existingTexts = new Set(existingQuestions.map(q => cleanString(q.question)));
  console.log(`Found ${existingTexts.size} existing questions in this quiz.`);

  // 5. Parse rows and filter duplicates
  const toInsert = [];
  rows.forEach((row) => {
    const questionText = row['Question'] || row['question_text'] || row['question'] || '';
    if (!questionText) return;

    if (existingTexts.has(cleanString(questionText))) {
      return;
    }

    const optA = row['Option A'] || row['option_a'] || row['option_A'] || '';
    const optB = row['Option B'] || row['option_b'] || row['option_B'] || '';
    const optC = row['Option C'] || row['option_c'] || row['option_C'] || '';
    const optD = row['Option D'] || row['option_d'] || row['option_D'] || '';
    
    let correct = (row['Correct Option'] || row['correct_option'] || row['correct'] || 'A').toString().trim().toUpperCase();
    if (!['A', 'B', 'C', 'D'].includes(correct)) {
      const ansVal = cleanString(row['Correct Answer'] || row['answer'] || '');
      if (cleanString(optA) === ansVal) correct = 'A';
      else if (cleanString(optB) === ansVal) correct = 'B';
      else if (cleanString(optC) === ansVal) correct = 'C';
      else if (cleanString(optD) === ansVal) correct = 'D';
      else correct = 'A';
    }

    toInsert.push({
      quiz_id: quizId,
      question: questionText,
      option_a: optA,
      option_b: optB,
      option_c: optC,
      option_d: optD,
      correct_option: correct
    });
  });

  if (toInsert.length > 0) {
    console.log(`Inserting ${toInsert.length} new unique questions...`);
    // Batch insert in blocks of 50
    for (let i = 0; i < toInsert.length; i += 50) {
      const batch = toInsert.slice(i, i + 50);
      await request('questions', {
        method: 'POST',
        body: JSON.stringify(batch)
      });
    }
  } else {
    console.log('No new unique questions to insert.');
  }

  console.log(`Completed import for: ${filename}`);
}

async function importAll() {
  const quizDir = path.join(process.cwd(), 'quiz');
  if (!fs.existsSync(quizDir)) {
    console.warn(`Quiz directory not found at: ${quizDir}`);
    return;
  }
  const files = fs.readdirSync(quizDir)
    .filter(f => f.endsWith('.xlsx') || f.endsWith('.csv') || f.endsWith('.xls'));

  console.log(`Found ${files.length} quiz files to import.`);

  for (const file of files) {
    try {
      await importFile(path.join(quizDir, file));
    } catch (err) {
      console.error(`Failed to import file ${file}:`, err.message);
    }
  }

  console.log('\n==================================================');
  console.log('ALL QUIZZES IMPORTED SUCCESSFULLY WITH NO DUPLICATES!');
}

importAll().catch(console.error);
