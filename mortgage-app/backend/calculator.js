export const calculationLimits = {
  annualSalary: { min: 1, max: 100_000_000 },
  monthlyDebts: { min: 0, max: 1_000_000 },
  downPayment: { min: 0, max: 100_000_000 },
  maxDtiPercent: { min: 1, max: 50 },
  interestRatePercent: { min: 0, max: 25 },
  termYears: { min: 1, max: 50 },
};

export function calculateAffordability(input) {
  const errors = {};

  for (const [field, { min, max }] of Object.entries(calculationLimits)) {
    const value = input[field];
    if (
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      value < min ||
      value > max ||
      (field === "termYears" && !Number.isInteger(value))
    ) {
      errors[field] = `Enter a value between ${min} and ${max}${field === "termYears" ? " whole years" : ""}.`;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  const monthlyIncome = input.annualSalary / 12;
  const monthlyPaymentBudget = Math.max(
    0,
    (monthlyIncome * input.maxDtiPercent) / 100 - input.monthlyDebts,
  );
  const monthlyInterestRate = input.interestRatePercent / 100 / 12;
  const numberOfPayments = input.termYears * 12;
  const maxLoanAmount =
    monthlyInterestRate === 0
      ? monthlyPaymentBudget * numberOfPayments
      : (monthlyPaymentBudget *
          (1 - (1 + monthlyInterestRate) ** -numberOfPayments)) /
        monthlyInterestRate;

  const roundToCents = (amount) => Math.round(amount * 100) / 100;
  return {
    result: {
      monthlyPaymentBudget: roundToCents(monthlyPaymentBudget),
      maxLoanAmount: roundToCents(maxLoanAmount),
      maxHomePrice: roundToCents(maxLoanAmount + input.downPayment),
    },
  };
}
