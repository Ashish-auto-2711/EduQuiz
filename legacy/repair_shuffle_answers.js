// ============================================================
// REPAIR SCRIPT: Randomize correct answer positions in DB
// Fetches all questions, shuffles options, updates correct_option
// ============================================================
const INSFORGE_URL = 'https://c43du8wy.us-east.insforge.app';
const INSFORGE_KEY = 'anon_61ab7eb0294a9648862366b8f8304a46b8fc7bdb08db307e9ef9c1b014768351';

async function req(path, opts = {}) {
  const headers = {
    'apikey': INSFORGE_KEY,
    'Authorization': `Bearer ${INSFORGE_KEY}`,
    'Content-Type': 'application/json',
    ...opts.headers
  };
  const res = await fetch(`${INSFORGE_URL}/api/database/records/${path}`, { ...opts, headers });
  if (!res.ok) { const t = await res.text(); throw new Error(`DB [${res.status}]: ${t}`); }
  if (res.status === 204) return null;
  return res.json();
}

// Fisher-Yates shuffle — truly random
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Shuffle a single question's options and return updated fields
function shuffleQuestion(q) {
  // Find which text is the correct answer
  const letterMap = { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d };
  const correctText = letterMap[q.correct_option];

  if (!correctText) return null; // skip malformed

  // Build options array
  const options = [
    { text: q.option_a },
    { text: q.option_b },
    { text: q.option_c },
    { text: q.option_d }
  ];

  // Fisher-Yates shuffle
  shuffleArray(options);

  // Find new correct letter
  const letters = ['A', 'B', 'C', 'D'];
  const newCorrectLetter = letters[options.findIndex(o => o.text === correctText)];

  return {
    option_a: options[0].text,
    option_b: options[1].text,
    option_c: options[2].text,
    option_d: options[3].text,
    correct_option: newCorrectLetter
  };
}

async function repairAllQuestions() {
  console.log('🔧 Starting correct-answer position repair...\n');

  let offset = 0;
  const pageSize = 200;
  let totalFixed = 0;
  let totalSkipped = 0;
  let totalAlreadyRandom = 0;

  while (true) {
    console.log(`  Fetching questions ${offset}–${offset + pageSize - 1}...`);
    const questions = await req(`questions?select=id,option_a,option_b,option_c,option_d,correct_option&limit=${pageSize}&offset=${offset}`);

    if (!questions || questions.length === 0) {
      console.log('  ✓ No more questions to process.');
      break;
    }

    // Count how many have A as correct in this batch
    const aCount = questions.filter(q => q.correct_option === 'A').length;
    console.log(`  Batch: ${questions.length} questions, ${aCount} have answer=A`);

    // Update each question with shuffled options
    const updateBatch = [];
    for (const q of questions) {
      const shuffled = shuffleQuestion(q);
      if (!shuffled) { totalSkipped++; continue; }
      updateBatch.push({ id: q.id, ...shuffled });
    }

    // Patch in batches of 50
    for (let i = 0; i < updateBatch.length; i += 50) {
      const batch = updateBatch.slice(i, i + 50);
      
      // Update each question individually (REST PATCH by id)
      for (const item of batch) {
        const { id, ...fields } = item;
        try {
          await req(`questions?id=eq.${id}`, {
            method: 'PATCH',
            headers: { 'Prefer': 'return=minimal' },
            body: JSON.stringify(fields)
          });
          totalFixed++;
        } catch (e) {
          console.warn(`    Warning: Failed to update question ${id}: ${e.message}`);
          totalSkipped++;
        }
      }
      process.stdout.write(`  Updated ${Math.min(i + 50, updateBatch.length)}/${updateBatch.length} in batch...\r`);
    }
    console.log(`\n  ✓ Batch complete. Total fixed so far: ${totalFixed}`);

    if (questions.length < pageSize) break; // Last page
    offset += pageSize;
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`✅ REPAIR COMPLETE!`);
  console.log(`   Fixed:   ${totalFixed} questions`);
  console.log(`   Skipped: ${totalSkipped} questions`);
  console.log(`${'='.repeat(50)}`);
}

repairAllQuestions().catch(e => {
  console.error('❌ Repair failed:', e.message);
  process.exit(1);
});
