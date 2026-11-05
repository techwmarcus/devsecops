import test from "node:test";
import assert from "node:assert/strict";
import {
  affordabilityIncomePercent,
  calculateAffordability,
} from "./calculator.js";

const sharedTerms = {
  downPaymentPercent: 20,
  interestRatePercent: 6.5,
  termYears: 30,
};

test("estimates maximum home price from salary and down-payment percentage", () => {
  const { result } = calculateAffordability({
    ...sharedTerms,
    calculationType: "salary-to-price",
    annualSalary: 120_000,
  });

  assert.equal(affordabilityIncomePercent, 28);
  assert.equal(result.monthlyPayment, 2800);
  assert.equal(result.maxLoanAmount, 442_990.29);
  assert.equal(result.maxHomePrice, 553_737.87);
  assert.equal(result.downPaymentAmount, 110_747.57);
});

test("estimates required salary from home price and down-payment percentage", () => {
  const { result } = calculateAffordability({
    ...sharedTerms,
    calculationType: "price-to-salary",
    homePrice: 500_000,
  });

  assert.equal(result.downPaymentAmount, 100_000);
  assert.equal(result.maxLoanAmount, 400_000);
  assert.equal(result.monthlyPayment, 2528.27);
  assert.equal(result.annualSalary, 108_354.52);
  assert.equal(result.maxHomePrice, 500_000);
});

test("supports a zero interest rate", () => {
  const { result } = calculateAffordability({
    ...sharedTerms,
    calculationType: "price-to-salary",
    homePrice: 360_000,
    interestRatePercent: 0,
    termYears: 15,
  });

  assert.equal(result.monthlyPayment, 1600);
  assert.equal(result.annualSalary, 68_571.43);
});

test("rejects invalid values and calculation types", () => {
  const { errors } = calculateAffordability({
    ...sharedTerms,
    calculationType: "unsupported",
    annualSalary: 0,
    termYears: 1.5,
    downPaymentPercent: 100,
  });

  assert.ok(errors.calculationType);
  assert.ok(errors.termYears);
  assert.ok(errors.downPaymentPercent);
});
