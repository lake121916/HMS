const { Op } = require('sequelize');
const { Patient } = require('../models');
const { AppError } = require('../utils/errors');

async function verifyAccount(accountNumber, lastName, dob) {
  if (!accountNumber || !lastName || !dob) {
    throw new AppError('IDENTITY_REQUIRED', 'Account number, last name, and date of birth are required', 400);
  }

  const patient = await Patient.findOne({ where: { accountNumber } });
  if (!patient) throw new AppError('ACCOUNT_NOT_FOUND', 'Patient account was not found', 404);
  if (patient.status !== 'ACTIVE') throw new AppError('ACCOUNT_NOT_ACTIVE', 'Patient account is not active', 403);

  const namesMatch = patient.lastName.trim().toLowerCase() === lastName.trim().toLowerCase();
  const dobMatch = patient.dob === dob;
  if (!namesMatch || !dobMatch) throw new AppError('IDENTITY_MISMATCH', 'Patient identity could not be verified', 403);

  return patient;
}

module.exports = { verifyAccount };
