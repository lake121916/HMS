/**
 * Medication Allergy & Contraindication Safety Engine
 * Alem Ketema Enat Hospital Management System
 * Clinical Cross-Reactivity Knowledge Base & Validation Service
 */

const pool = require('../config/database');

/**
 * Curated Clinical Drug Classes & Cross-Reactivity Rules
 * Formulated from Ethiopian National Drug Formulary (NDF) & WHO Model Formulary
 */
const CLINICAL_DRUG_CLASSES = {
  penicillins: {
    className: 'Penicillin-Class Beta-Lactam Antibiotic',
    members: ['penicillin', 'penicillin g', 'penicillin v', 'amoxicillin', 'ampicillin', 'augmentin', 'amoxicillin-clavulanate', 'piperacillin', 'cloxacillin', 'flucloxacillin', 'methicillin', 'amoxil'],
    crossReactivity: [
      {
        targetClass: 'cephalosporins',
        risk: 'moderate',
        message: 'Cephalosporins share a beta-lactam ring with penicillins. Cross-reactivity risk is approximately 3-10% (higher in 1st/2nd generation).'
      }
    ]
  },
  cephalosporins: {
    className: 'Cephalosporin Antibiotic',
    members: ['ceftriaxone', 'cefotaxime', 'cefuroxime', 'cefalexin', 'cephalexin', 'cefazolin', 'cephradine', 'cefepime', 'cefpodoxime', 'cefixime', 'rocephin'],
    crossReactivity: [
      {
        targetClass: 'penicillins',
        risk: 'moderate',
        message: 'Penicillin-allergic patients have potential cross-reactivity with cephalosporins due to structural beta-lactam homology.'
      }
    ]
  },
  sulfonamides: {
    className: 'Sulfonamide (Sulfa) Antimicrobial',
    members: ['sulfamethoxazole', 'cotrimoxazole', 'co-trimoxazole', 'bactrim', 'septra', 'trimethoprim-sulfamethoxazole', 'silver sulfadiazine', 'sulfadiazine', 'sulfasalazine'],
    crossReactivity: []
  },
  nsaids: {
    className: 'Non-Steroidal Anti-Inflammatory Drug (NSAID)',
    members: ['aspirin', 'acetylsalicylic acid', 'ibuprofen', 'diclofenac', 'naproxen', 'meloxicam', 'ketoprofen', 'indomethacin', 'piroxicam', 'celecoxib', 'voltaren', 'brufen'],
    crossReactivity: []
  },
  macrolides: {
    className: 'Macrolide Antibiotic',
    members: ['erythromycin', 'clarithromycin', 'azithromycin', 'roxithromycin'],
    crossReactivity: []
  },
  fluoroquinolones: {
    className: 'Fluoroquinolone Antibiotic',
    members: ['ciprofloxacin', 'levofloxacin', 'moxifloxacin', 'norfloxacin', 'ofloxacin', 'cipro'],
    crossReactivity: []
  },
  opioids: {
    className: 'Opioid Analgesic',
    members: ['morphine', 'codeine', 'tramadol', 'pethidine', 'meperidine', 'fentanyl', 'oxycodone'],
    crossReactivity: []
  },
  tetracyclines: {
    className: 'Tetracycline Antibiotic',
    members: ['doxycycline', 'tetracycline', 'minocycline', 'oxytetracycline'],
    crossReactivity: []
  },
  aminoglycosides: {
    className: 'Aminoglycoside Antibiotic',
    members: ['gentamicin', 'amikacin', 'tobramycin', 'streptomycin', 'neomycin'],
    crossReactivity: []
  }
};

/**
 * Normalize medication text for clinical comparison
 */
function normalizeName(name) {
  if (!name) return '';
  return name.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
}

/**
 * Identify clinical drug class for a given medication name
 */
function findDrugClass(medicationName) {
  const normMed = normalizeName(medicationName);
  for (const [classKey, classDef] of Object.entries(CLINICAL_DRUG_CLASSES)) {
    for (const member of classDef.members) {
      if (normMed.includes(member) || member.includes(normMed)) {
        return { classKey, classDef, matchedMember: member };
      }
    }
  }
  return null;
}

/**
 * Check a proposed medication against patient allergy records
 * @param {number} patientId
 * @param {string} proposedMedication
 */
async function checkMedicationAllergy(patientId, proposedMedication) {
  // 1. Fetch patient allergy records
  const allergiesRes = await pool.query(`
    SELECT * FROM patient_allergies
    WHERE patient_id = $1 AND verification_status != 'refuted'
  `, [patientId]);

  // Also fetch patient demographic and legacy allergies text
  const patRes = await pool.query(`
    SELECT id, first_name, last_name, allergies FROM patients WHERE id = $1
  `, [patientId]);

  if (!patRes.rows.length) {
    throw new Error('Patient not found');
  }

  const patient = patRes.rows[0];
  const structuredAllergies = allergiesRes.rows;
  const legacyAllergyText = patient.allergies ? patient.allergies.trim() : '';

  const alerts = [];
  const normProposed = normalizeName(proposedMedication);
  const proposedClassInfo = findDrugClass(proposedMedication);

  // 2. Evaluate structured allergy records
  for (const allergy of structuredAllergies) {
    const normAllergen = normalizeName(allergy.allergen_name);
    const allergenClassInfo = findDrugClass(allergy.allergen_name);

    let matchType = null;
    let reason = '';
    let recommendation = '';

    // Direct / exact name match
    if (normProposed.includes(normAllergen) || normAllergen.includes(normProposed)) {
      matchType = 'exact_or_active_ingredient';
      reason = `The proposed medication "${proposedMedication}" matches recorded allergen "${allergy.allergen_name}".`;
      recommendation = `DO NOT PRESCRIBE. Select an alternative medication with a different active chemical structure.`;
    }
    // Same pharmacological class match
    else if (
      proposedClassInfo &&
      allergenClassInfo &&
      proposedClassInfo.classKey === allergenClassInfo.classKey
    ) {
      matchType = 'same_drug_class';
      reason = `"${proposedMedication}" is a member of the ${proposedClassInfo.classDef.className} family. The patient has a recorded allergy to "${allergy.allergen_name}", which belongs to the same class.`;
      recommendation = `High risk of cross-reaction. Review alternative antibiotic/medication class.`;
    }
    // Clinically known cross-reactivity (e.g. penicillin vs cephalosporin)
    else if (proposedClassInfo && allergenClassInfo) {
      const crossRule = proposedClassInfo.classDef.crossReactivity.find(
        cr => cr.targetClass === allergenClassInfo.classKey
      ) || allergenClassInfo.classDef.crossReactivity.find(
        cr => cr.targetClass === proposedClassInfo.classKey
      );

      if (crossRule) {
        matchType = 'cross_reactivity_class';
        reason = `Cross-reactivity warning: ${crossRule.message}`;
        recommendation = `Assess patient allergy history carefully. In severe penicillin allergy (anaphylaxis), cephalosporins should be avoided.`;
      }
    }

    if (matchType) {
      const isSevere = allergy.severity === 'anaphylaxis' || allergy.severity === 'severe';
      alerts.push({
        patientId: patient.id,
        patientName: `${patient.first_name} ${patient.last_name}`,
        proposedMedication,
        recordedAllergen: allergy.allergen_name,
        allergenCategory: allergy.allergen_category,
        reactionDescription: allergy.reaction_description || 'Not specified',
        severity: allergy.severity || 'moderate',
        verificationStatus: allergy.verification_status,
        matchType,
        isSevere,
        reason,
        recommendation
      });
    }
  }

  // 3. Fallback check for legacy unstructured text if no alerts found yet
  if (alerts.length === 0 && legacyAllergyText) {
    const normLegacy = normalizeName(legacyAllergyText);
    let legacyMatch = false;

    if (normLegacy.includes(normProposed) || normProposed.includes(normLegacy)) {
      legacyMatch = true;
    } else if (proposedClassInfo) {
      for (const member of proposedClassInfo.classDef.members) {
        if (normLegacy.includes(member)) {
          legacyMatch = true;
          break;
        }
      }
    }

    if (legacyMatch) {
      alerts.push({
        patientId: patient.id,
        patientName: `${patient.first_name} ${patient.last_name}`,
        proposedMedication,
        recordedAllergen: legacyAllergyText,
        allergenCategory: 'drug',
        reactionDescription: 'Legacy medical record notation',
        severity: 'moderate',
        verificationStatus: 'unverified',
        matchType: 'legacy_text_match',
        isSevere: false,
        reason: `Patient record has historical allergy notation: "${legacyAllergyText}".`,
        recommendation: `Verify allergy details with patient before finalizing prescription.`
      });
    }
  }

  const hasConflict = alerts.length > 0;
  const hardBlocked = alerts.some(a => a.severity === 'anaphylaxis' && a.matchType !== 'cross_reactivity_class');
  const requiresOverride = hasConflict;

  return {
    safe: !hasConflict,
    hasConflict,
    hardBlocked,
    requiresOverride,
    alerts,
    uncertaintyNote: structuredAllergies.length === 0 && !legacyAllergyText
      ? 'No recorded allergy history on file for this patient. Prescriber should inquire directly with the patient.'
      : null
  };
}

module.exports = {
  checkMedicationAllergy,
  findDrugClass,
  CLINICAL_DRUG_CLASSES
};
