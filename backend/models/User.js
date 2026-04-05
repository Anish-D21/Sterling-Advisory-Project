/**
 * models/User.js — Sterling Advisory User Schema
 * MongoDB / Mongoose schema with nested financial profile
 */

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

// ── Financial Profile Sub-Schema ──────────────────────────────
const financialProfileSchema = new mongoose.Schema({
  monthlyIncome:     { type: Number, default: 0 },   // Post-tax in-hand
  rent:              { type: Number, default: 0 },
  existingEMIs:      { type: Number, default: 0 },
  monthlySavings:    { type: Number, default: 0 },
  discretionarySpend:{ type: Number, default: 0 },
  emergencyFund:     { type: Number, default: 0 },

  // Loan history
  loans: [{
    principalAmount: Number,
    annualRate:      Number,
    tenureMonths:    Number,
    processingFee:   Number,
    startDate:       { type: Date, default: Date.now },
    loanType:        { type: String, enum: ['personal','home','auto','education','other'] },
    emi:             Number,
    disbursal:       Number,
    totalInterest:   Number
  }],

  // Goals
  goals: [{
    name:        String,
    presentCost: Number,
    years:       Number,
    futureCost:  Number,
    monthlySIP:  Number,
    createdAt:   { type: Date, default: Date.now }
  }],

  // CIBIL snapshot
  cibilHistory: [{
    score:          Number,
    projectedScore: Number,
    recordedAt:     { type: Date, default: Date.now }
  }]
}, { _id: false });

// ── User Schema ───────────────────────────────────────────────
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true, maxlength: 100
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true, trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Invalid email format']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 8,
    select: false    // Never return password in queries
  },
  financialProfile: {
    type: financialProfileSchema,
    default: () => ({})
  },
  createdAt:  { type: Date, default: Date.now },
  lastLogin:  { type: Date }
}, {
  timestamps: true
});

// ── Pre-save hook: Hash password ───────────────────────────────
userSchema.pre('save', async function(next) {
  // Only hash if password was modified
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ── Instance method: Compare password ─────────────────────────
userSchema.methods.comparePassword = async function(candidatePwd) {
  return bcrypt.compare(candidatePwd, this.password);
};

// ── Instance method: Safe JSON (no password) ──────────────────
userSchema.methods.toSafeJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

// ── Index on email for fast lookups ───────────────────────────
// userSchema.index({ email: 1 });

module.exports = mongoose.model('User', userSchema);