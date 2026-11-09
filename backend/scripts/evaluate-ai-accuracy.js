/**
 * AI Disease Prediction Model Accuracy & Validation Benchmark CLI Runner
 * Alem Ketema Enat Hospital Management System
 * Candidate: Lake Awraris | Debre Berhan University (DBU)
 */

const { runBenchmark } = require('../src/services/aiBenchmarkService');

async function main() {
  console.log('========================================================================');
  console.log(' ALEM KETEMA ENAT HOSPITAL - AI DECISION SUPPORT BENCHMARK EVALUATION');
  console.log(' Candidate: Lake Awraris | Debre Berhan University');
  console.log('========================================================================\n');

  const result = await runBenchmark();
  const { summary, allergySafetyBenchmark, diseases } = result;

  console.log(`Evaluated ${summary.totalCases} clinical benchmark cases across ${diseases.length} disease categories in ${summary.executionDurationMs}ms:\n`);
  console.log('-----------------------------------------------------------------------------------------------------');
  console.log(String('Disease Profile').padEnd(46) + '| Cases | Top-1 Correct | Top-1 Acc | Top-3 Acc');
  console.log('-----------------------------------------------------------------------------------------------------');

  for (const d of diseases) {
    console.log(
      d.name.padEnd(46) + '| ' +
      String(d.total).padStart(5) + ' | ' +
      String(d.top1).padStart(13) + ' | ' +
      (d.top1Accuracy.toFixed(1) + '%').padStart(9) + ' | ' +
      (d.top3Accuracy.toFixed(1) + '%').padStart(9)
    );
  }

  console.log('-----------------------------------------------------------------------------------------------------');
  console.log(`OVERALL TOP-1 DIAGNOSTIC ACCURACY:            ${summary.top1Accuracy.toFixed(2)}%`);
  console.log(`OVERALL TOP-3 DIFFERENTIAL ACCURACY:          ${summary.top3Accuracy.toFixed(2)}%`);
  console.log(`MACRO-AVERAGED SENSITIVITY / RECALL:          ${summary.macroSensitivity.toFixed(2)}%`);
  console.log(`AVERAGE SPECIFICITY ACROSS PROFILE:           ${summary.macroSpecificity.toFixed(1)}%`);
  console.log(`HARMONIC F1-SCORE:                            ${summary.f1Score.toFixed(3)}`);
  console.log(`ALLERGY SAFETY CONTRAINDICATION INTERCEPT:    ${allergySafetyBenchmark.interceptRate}% (${allergySafetyBenchmark.testedContraindications}/${allergySafetyBenchmark.testedContraindications} blocked)`);
  console.log('=====================================================================================================\n');
}

main().catch(console.error);
