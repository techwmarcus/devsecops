import test from "node:test";
import assert from "node:assert/strict";
import { calculateAffordability } from "./calculator.js";

const sample = {
  annualSalary: 120_000,
  monthlyDebts: 500,
  downPayment: 50_000,
  maxDtiPercent: 36,
  interestRatePercent: 6,
  termYears: 30,
};

test("calculates a loan using gross monthly income, debts, rate, and term", () => {
  const { result } = calculateAffordability(sample);
  assert.equal(result.monthlyPaymentBudget, 3100);
  assert.equal(result.maxLoanAmount, 517_054);
  assert.equal(result.maxHomePrice, 567_054);
});

test("supports a zero interest rate", () => {
  const { result } = calculateAffordability({
    ...sample,
    interestRatePercent: 0,
    termYears: 15,
  });
  assert.equal(result.maxLoanAmount, 558_000);
});

test("does not allow existing debts to exceed the DTI budget", () => {
  const { result } = calculateAffordability({
    ...sample,
    monthlyDebts: 5000,
  });
  assert.equal(result.monthlyPaymentBudget, 0);
  assert.equal(result.maxLoanAmount, 0);
  assert.equal(result.maxHomePrice, sample.downPayment);
});

test("returns field errors for invalid values", () => {
  const { errors } = calculateAffordability({
    ...sample,
    annualSalary: 0,
    termYears: 1.5,
    interestRatePercent: 30,
  });
  assert.ok(errors.annualSalary);
  assert.ok(errors.termYears);
  assert.ok(errors.interestRatePercent);
});
